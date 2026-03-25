import type { Id, NullableId, Params, ServiceInterface } from '@feathersjs/feathers'
import { NotFound, GeneralError } from '@feathersjs/errors'
import type { Application } from '../../declarations'
import { pb, ensureAuth } from '../../db'
import type {
  SendEmail,
  SendEmailData,
  SendEmailPatch,
  SendEmailQuery
} from './send-email.schema'

const nodemailer = require('nodemailer')
import { logger } from '../../logger'

export type { SendEmail, SendEmailData, SendEmailPatch, SendEmailQuery }

export interface SendEmailServiceOptions {
  app: Application
}

export interface SendEmailParams extends Params<SendEmailQuery> {}

export class SendEmailService<ServiceParams extends SendEmailParams = SendEmailParams>
  implements ServiceInterface<SendEmail, SendEmailData, ServiceParams, SendEmailPatch>
{
  constructor(public options: SendEmailServiceOptions) {}

  async create(data: SendEmailData, _params?: ServiceParams): Promise<SendEmail> {
    // 1. Fetch template
    let record: any
    try {
      record = await pb.collection('email_templates').getOne(String(data.templateId))
    } catch {
      await this._log({ to: data.to, subject: data.subject, templateId: data.templateId, templateName: undefined, status: 'error', errorMessage: `Template ${data.templateId} not found` })
      throw new NotFound(`Template ${data.templateId} not found`)
    }

    // 2. Substitute {{variable}} placeholders
    const variables = (data.variables ?? {}) as Record<string, string>
    const html = (record.html_content as string).replace(
      /\{\{(\w+)\}\}/g,
      (_, key: string) => variables[key] ?? ''
    )

    const subject = data.subject ?? record.subject

    // 3. Send via Gmail OAuth2
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: 'imersao@42sp.org.br',
          clientId: process.env.CLIENT_ID,
          clientSecret: process.env.CLIENT_SECRET,
          refreshToken: process.env.REFRESH_TOKEN
        }
      })

      await transporter.sendMail({
        from: 'imersao@42sp.org.br',
        to: data.to,
        subject,
        html
      })

      const successMsg = `[send-email] SUCCESS | to: ${data.to} | template: "${record.name}" (${data.templateId}) | subject: "${subject}" | at: ${new Date().toISOString()}`
      console.log(successMsg)
      logger.info(successMsg)
      await this._log({ to: data.to, subject, templateId: data.templateId, templateName: record.name, status: 'success' })
    } catch (error: any) {
      const errorMsg = `[send-email] ERROR | to: ${data.to} | template: "${record.name}" (${data.templateId}) | subject: "${subject}" | error: ${error?.message ?? error} | at: ${new Date().toISOString()}`
      console.error(errorMsg)
      logger.error(errorMsg)
      await this._log({ to: data.to, subject, templateId: data.templateId, templateName: record.name, status: 'error', errorMessage: error?.message ?? String(error) })
      throw new GeneralError('Failed to send email')
    }

    return data
  }

  private async _log(entry: {
    to: string
    subject?: string
    templateId?: string
    templateName?: string
    status: 'success' | 'error'
    errorMessage?: string
  }) {
    try {
      await ensureAuth()
      await pb.collection('email_logs').create({
        to: entry.to,
        subject: entry.subject ?? '',
        template_id: entry.templateId ?? '',
        template_name: entry.templateName ?? '',
        status: entry.status,
        error_message: entry.errorMessage ?? '',
      })
    } catch (err) {
      logger.warn('[send-email] Failed to write log entry: %O', err)
    }
  }

  // Satisfy interface — not exposed
  async find(_params?: ServiceParams): Promise<SendEmail[]> { return [] }
  async get(id: Id, _params?: ServiceParams): Promise<SendEmail> {
    return { templateId: String(id), to: '', variables: {} }
  }
  async patch(_id: NullableId, _data: SendEmailPatch, _params?: ServiceParams): Promise<SendEmail> {
    return { templateId: '', to: '', variables: {} }
  }
  async remove(_id: NullableId, _params?: ServiceParams): Promise<SendEmail> {
    return { templateId: '', to: '', variables: {} }
  }
}

export const getOptions = (app: Application) => {
  return { app }
}
