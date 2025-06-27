// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from '../../client'
import type {
  SendCertificate,
  SendCertificateData,
  SendCertificatePatch,
  SendCertificateQuery,
  SendCertificateService
} from './send-certificate.class'

export type { SendCertificate, SendCertificateData, SendCertificatePatch, SendCertificateQuery }

export type SendCertificateClientService = Pick<
  SendCertificateService<Params<SendCertificateQuery>>,
  (typeof sendCertificateMethods)[number]
>

export const sendCertificatePath = 'send-certificate'

export const sendCertificateMethods: Array<keyof SendCertificateService> = [
  'find',
  'get',
  'create',
  'patch',
  'remove'
]

export const sendCertificateClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(sendCertificatePath, connection.service(sendCertificatePath), {
    methods: sendCertificateMethods
  })
}

// Add this service to the client service type index
declare module '../../client' {
  interface ServiceTypes {
    [sendCertificatePath]: SendCertificateClientService
  }
}
