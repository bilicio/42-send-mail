/**
 * Conta Gmail (OAuth2) usada em todos os envios. Tudo vem do .env:
 *   MAIL_USER      conta que autentica no Gmail
 *   MAIL_FROM      remetente exibido (opcional; padrão = MAIL_USER)
 *   CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN  credenciais OAuth2
 */
const nodemailer = require('nodemailer')

function mailUser(): string {
  const user = process.env.MAIL_USER?.trim()
  if (!user) throw new Error('MAIL_USER não definido no .env')
  return user
}

export const mailFrom = (): string => process.env.MAIL_FROM?.trim() || mailUser()

export function createMailTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: mailUser(),
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      refreshToken: process.env.REFRESH_TOKEN
    }
  })
}
