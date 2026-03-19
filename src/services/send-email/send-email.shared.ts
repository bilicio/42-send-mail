import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from '../../client'
import type {
  SendEmail,
  SendEmailData,
  SendEmailPatch,
  SendEmailQuery,
  SendEmailService
} from './send-email.class'

export type { SendEmail, SendEmailData, SendEmailPatch, SendEmailQuery }

export type SendEmailClientService = Pick<
  SendEmailService<Params<SendEmailQuery>>,
  (typeof sendEmailMethods)[number]
>

export const sendEmailPath = 'send-email'

export const sendEmailMethods: Array<keyof SendEmailService> = ['create']

export const sendEmailClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(sendEmailPath, connection.service(sendEmailPath), {
    methods: sendEmailMethods
  })
}

declare module '../../client' {
  interface ServiceTypes {
    [sendEmailPath]: SendEmailClientService
  }
}
