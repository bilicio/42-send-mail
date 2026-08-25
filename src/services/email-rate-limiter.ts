import { logger } from '../logger'

const DEFAULT_DELAY_MS = 2000

function getDelayMs(): number {
  const raw = process.env.EMAIL_SEND_DELAY_MS
  if (!raw) return DEFAULT_DELAY_MS
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_DELAY_MS
}

let chain: Promise<unknown> = Promise.resolve()
let lastStartedAt = 0
let pending = 0

export function scheduleEmailSend<T>(sendFn: () => Promise<T>): Promise<T> {
  pending += 1
  const position = pending

  const result = chain.then(async () => {
    const delayMs = getDelayMs()
    const wait = Math.max(0, lastStartedAt + delayMs - Date.now())
    if (wait > 0) {
      logger.info(
        `[email-rate-limiter] queued send #${position} — waiting ${wait}ms (pending=${pending})`
      )
      await new Promise((resolve) => setTimeout(resolve, wait))
    }
    lastStartedAt = Date.now()
    try {
      return await sendFn()
    } finally {
      pending -= 1
    }
  })

  chain = result.catch(() => {})
  return result
}
