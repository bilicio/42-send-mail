import 'dotenv/config'
import PocketBase from 'pocketbase'

const url = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090'

export const pb = new PocketBase(url)

pb.autoCancellation(false)

export async function authenticatePocketBase() {
  const email = process.env.POCKETBASE_ADMIN_EMAIL
  const password = process.env.POCKETBASE_ADMIN_PASSWORD
  if (email && password) {
    console.log('[PocketBase] Autenticando como', email)
    await pb.collection('_superusers').authWithPassword(email, password)
    console.log('[PocketBase] Autenticado com sucesso. Token válido:', pb.authStore.isValid)
  }
}

// Deduplica re-autenticações concorrentes: se várias requisições dispararem ao
// mesmo tempo com o token expirado, todas aguardam a mesma promessa de auth.
let authInFlight: Promise<void> | null = null

/** Garante que o token está válido, re-autentica se necessário */
export async function ensureAuth() {
  if (pb.authStore.isValid) return
  if (!authInFlight) {
    console.warn('[PocketBase] Token expirado ou ausente, re-autenticando...')
    authInFlight = authenticatePocketBase().finally(() => {
      authInFlight = null
    })
  }
  await authInFlight
}

// Choke point: antes de CADA requisição ao PocketBase, garante um token de
// superusuário válido e injeta o token atual no header Authorization.
//
// Isto é necessário porque o `initSendOptions` do SDK grava o header
// Authorization com o token vigente ANTES do beforeSend rodar — então apenas
// re-autenticar aqui não basta: precisamos sobrescrever o header com o token
// já renovado. Sem isso, o token expirado do startup continuava sendo enviado
// e o PocketBase respondia 403 "Only superusers can perform this action".
//
// A própria requisição de autenticação (auth-with-password) é ignorada para
// evitar recursão infinita.
pb.beforeSend = async (requestUrl, options) => {
  if (!requestUrl.includes('/auth-with-password')) {
    await ensureAuth()
    if (pb.authStore.token) {
      options.headers = { ...(options.headers || {}), Authorization: pb.authStore.token }
    }
  }
  return { url: requestUrl, options }
}
