/**
 * Login do painel por email + código de 6 dígitos.
 *
 * Só quem está em AUTH_ALLOWED_EMAILS (lista separada por vírgula no .env)
 * consegue pedir um código. O código vai por email, vale CODE_TTL_MS e aceita
 * MAX_ATTEMPTS tentativas. Acertando, o servidor devolve um token assinado
 * (HMAC com AUTH_SECRET) que o frontend manda no header Authorization.
 *
 * Os códigos ficam em memória: um restart do servidor invalida os pendentes,
 * o que só obriga a pedir outro. Os tokens não dependem de estado — continuam
 * válidos após restart enquanto AUTH_SECRET for o mesmo.
 */
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import type { Application } from './declarations'
import { logger } from './logger'
import { normalizeEmail } from './utils/email'
import { scheduleEmailSend } from './services/email-rate-limiter'
import { createMailTransport, mailFrom } from './mailer'

const CODE_TTL_MS = 10 * 60 * 1000
const RESEND_INTERVAL_MS = 60 * 1000
const MAX_ATTEMPTS = 5
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000

function allowedEmails(): Set<string> {
  return new Set(
    (process.env.AUTH_ALLOWED_EMAILS ?? '')
      .split(',')
      .map(normalizeEmail)
      .filter(Boolean)
  )
}

export const isAllowedEmail = (email: string) => allowedEmails().has(normalizeEmail(email))

// Sem AUTH_SECRET o servidor ainda funciona, mas cada restart derruba todas as
// sessões — por isso o aviso.
let secret = process.env.AUTH_SECRET
if (!secret) {
  secret = randomBytes(32).toString('hex')
  logger.warn('[auth] AUTH_SECRET não definido; usando um segredo aleatório (sessões caem a cada restart)')
}

const sign = (payload: string) => createHmac('sha256', secret!).update(payload).digest('base64url')

const safeEqual = (a: string, b: string) => {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

export function createToken(email: string): string {
  const payload = Buffer.from(JSON.stringify({ email, exp: Date.now() + TOKEN_TTL_MS })).toString('base64url')
  return `${payload}.${sign(payload)}`
}

/** Email do token, ou null se inválido, expirado ou fora da lista atual. */
export function verifyToken(token: string | undefined): string | null {
  if (!token) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return null
  try {
    const { email, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (typeof email !== 'string' || typeof exp !== 'number' || exp < Date.now()) return null
    // Tirar alguém do .env revoga o acesso na hora, mesmo com token válido.
    return isAllowedEmail(email) ? email : null
  } catch {
    return null
  }
}

const bearer = (req: any): string | undefined => {
  const header = String(req.headers?.authorization ?? '')
  return header.startsWith('Bearer ') ? header.slice(7).trim() : undefined
}

/** Middleware Express: 401 sem um token válido. */
export const requireAuth = (req: any, res: any, next: any) => {
  if (req.method === 'OPTIONS') return next()
  const email = verifyToken(bearer(req))
  if (!email) return res.status(401).json({ message: 'Não autenticado' })
  req.authEmail = email
  next()
}

interface PendingCode {
  hash: string
  expiresAt: number
  sentAt: number
  attempts: number
}

const pending = new Map<string, PendingCode>()

const hashCode = (email: string, code: string) =>
  createHash('sha256').update(`${email}:${code}`).digest('hex')

async function sendCodeEmail(to: string, code: string) {
  const transporter = createMailTransport()
  await scheduleEmailSend(() =>
    transporter.sendMail({
      from: mailFrom(),
      to,
      subject: `Seu código de acesso: ${code}`,
      text: `Seu código de acesso ao Email Editor é ${code}.\n\nEle expira em 10 minutos. Se não foi você que pediu, ignore este email.`,
      html: `<p>Seu código de acesso ao Email Editor é:</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:6px;font-family:monospace">${code}</p>
<p style="color:#6b7280">Ele expira em 10 minutos. Se não foi você que pediu, ignore este email.</p>`
    })
  )
}

export const auth = (app: Application) => {
  // POST /auth/request-code — { email }
  ;(app as any).post('/auth/request-code', async (req: any, res: any) => {
    const email = normalizeEmail(req.body?.email)
    if (!email || !isAllowedEmail(email)) {
      return res.status(403).json({ message: 'Este email não tem acesso à plataforma' })
    }

    const current = pending.get(email)
    if (current && Date.now() - current.sentAt < RESEND_INTERVAL_MS) {
      const wait = Math.ceil((current.sentAt + RESEND_INTERVAL_MS - Date.now()) / 1000)
      return res.status(429).json({ message: `Aguarde ${wait}s para pedir um novo código` })
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
    const now = Date.now()
    pending.set(email, { hash: hashCode(email, code), expiresAt: now + CODE_TTL_MS, sentAt: now, attempts: 0 })

    try {
      await sendCodeEmail(email, code)
      logger.info(`[auth] código enviado para ${email}`)
      res.json({ ok: true })
    } catch (err) {
      pending.delete(email)
      logger.error('[auth] falha ao enviar código para %s: %O', email, err)
      res.status(500).json({ message: 'Não foi possível enviar o código' })
    }
  })

  // POST /auth/verify-code — { email, code } → { token, email }
  ;(app as any).post('/auth/verify-code', (req: any, res: any) => {
    const email = normalizeEmail(req.body?.email)
    const code = String(req.body?.code ?? '').trim()
    const entry = pending.get(email)

    if (!entry || entry.expiresAt < Date.now() || !isAllowedEmail(email)) {
      pending.delete(email)
      return res.status(401).json({ message: 'Código expirado. Peça um novo.' })
    }
    if (!safeEqual(entry.hash, hashCode(email, code))) {
      entry.attempts += 1
      if (entry.attempts >= MAX_ATTEMPTS) {
        pending.delete(email)
        return res.status(401).json({ message: 'Muitas tentativas. Peça um novo código.' })
      }
      return res.status(401).json({ message: 'Código incorreto' })
    }

    pending.delete(email)
    logger.info(`[auth] login de ${email}`)
    res.json({ token: createToken(email), email })
  })

  // GET /auth/me — confere se o token ainda vale.
  ;(app as any).get('/auth/me', requireAuth, (req: any, res: any) => {
    res.json({ email: req.authEmail })
  })
}
