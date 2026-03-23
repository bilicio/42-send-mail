import type { Application } from '../../declarations'
import { pb, ensureAuth } from '../../db'

export const emailLogsPath = 'email-logs'

function serialize(r: any) {
  return {
    id: r.id,
    to: r.to,
    subject: r.subject,
    template_id: r.template_id,
    template_name: r.template_name,
    status: r.status,
    error_message: r.error_message,
    created: r.created,
  }
}

export const emailLogs = (app: Application) => {
  // GET /email-logs — full list (used by the frontend page)
  ;(app as any).get(`/${emailLogsPath}`, async (_req: any, res: any) => {
    try {
      await ensureAuth()
      const records = await pb.collection('email_logs').getFullList({ sort: '-created' })
      res.json(records.map(serialize))
    } catch (err) {
      console.error('[email-logs] Error:', err)
      res.status(500).json({ error: 'Failed to fetch logs', details: String(err) })
    }
  })

  // POST /email-logs/query — { emails: string[] }
  // Returns the last log entry for each email provided.
  // Emails with no log entry are omitted from the response.
  ;(app as any).post(`/${emailLogsPath}/query`, async (req: any, res: any) => {
    const emails: unknown = req.body?.emails

    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: '"emails" must be a non-empty array of strings' })
    }

    const sanitized = emails.filter((e) => typeof e === 'string' && e.trim()) as string[]
    if (sanitized.length === 0) {
      return res.status(400).json({ error: '"emails" must contain at least one valid string' })
    }

    const templateId: string | undefined =
      typeof req.body?.template_id === 'string' && req.body.template_id.trim()
        ? req.body.template_id.trim()
        : undefined

    try {
      await ensureAuth()
      // Fetch the latest log for each email in parallel
      const results = await Promise.all(
        sanitized.map(async (email) => {
          const safe = email.replace(/"/g, '')
          const filter = templateId
            ? `to = "${safe}" && template_id = "${templateId.replace(/"/g, '')}"`
            : `to = "${safe}"`
          const records = await pb.collection('email_logs').getList(1, 1, {
            filter,
            sort: '-created',
          })
          const last = records.items[0]
          return last ? { email, log: serialize(last) } : { email, log: null }
        })
      )

      res.json(results)
    } catch (err) {
      console.error('[email-logs/query] Error:', err)
      res.status(500).json({ error: 'Failed to query logs', details: String(err) })
    }
  })
}
