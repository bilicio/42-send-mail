import type { Application } from '../../declarations'
import { pb } from '../../db'

export const emailLogsPath = 'email-logs'

export const emailLogs = (app: Application) => {
  ;(app as any).get(`/${emailLogsPath}`, async (_req: any, res: any) => {
    try {
      const records = await pb.collection('email_logs').getFullList({ sort: '-created' })
      res.json(records.map((r: any) => ({
        id: r.id,
        to: r.to,
        subject: r.subject,
        template_id: r.template_id,
        template_name: r.template_name,
        status: r.status,
        error_message: r.error_message,
        created: r.created,
      })))
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch logs' })
    }
  })
}
