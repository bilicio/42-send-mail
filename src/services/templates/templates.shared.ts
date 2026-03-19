import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from '../../client'
import type {
  EmailTemplate,
  EmailTemplateData,
  EmailTemplatePatch,
  EmailTemplateQuery,
  EmailTemplatesService
} from './templates.class'

export type { EmailTemplate, EmailTemplateData, EmailTemplatePatch, EmailTemplateQuery }

export type EmailTemplatesClientService = Pick<
  EmailTemplatesService<Params<EmailTemplateQuery>>,
  (typeof emailTemplatesMethods)[number]
>

export const emailTemplatesPath = 'templates'

export const emailTemplatesMethods: Array<keyof EmailTemplatesService> = [
  'find',
  'get',
  'create',
  'patch',
  'remove'
]

export const emailTemplatesClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(emailTemplatesPath, connection.service(emailTemplatesPath), {
    methods: emailTemplatesMethods
  })
}

// Add this service to the client service type index
declare module '../../client' {
  interface ServiceTypes {
    [emailTemplatesPath]: EmailTemplatesClientService
  }
}
