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

/** Garante que o token está válido, re-autentica se necessário */
export async function ensureAuth() {
  if (!pb.authStore.isValid) {
    console.warn('[PocketBase] Token expirado ou ausente, re-autenticando...')
    await authenticatePocketBase()
  }
}
