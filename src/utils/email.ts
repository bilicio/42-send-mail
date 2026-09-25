/**
 * Normalização de endereço de email.
 *
 * O filtro `to = "..."` do PocketBase é case-sensitive. Enquanto o log guardava
 * o `to` exatamente como veio na requisição, um email enviado para
 * "Fulano@x.com" não era encontrado por quem consultava "fulano@x.com" — o
 * chamador via "sem registro" para um envio que aconteceu.
 *
 * Agora o `to` é gravado sempre em minúsculas, e a consulta em /email-logs/query
 * compara sem case (ver email-logs.ts), o que cobre também os registros
 * gravados antes desta mudança.
 */
export const normalizeEmail = (valor: unknown): string =>
  String(valor ?? '').trim().toLowerCase()
