import { hooks as schemaHooks } from '@feathersjs/schema'

import {
  sendEmailDataValidator,
  sendEmailQueryValidator,
  sendEmailResolver,
  sendEmailExternalResolver,
  sendEmailDataResolver,
  sendEmailQueryResolver
} from './send-email.schema'

import type { Application } from '../../declarations'
import { SendEmailService, getOptions } from './send-email.class'
import { sendEmailPath, sendEmailMethods } from './send-email.shared'

export * from './send-email.class'
export * from './send-email.schema'

export const sendEmail = (app: Application) => {
  app.use(sendEmailPath, new SendEmailService(getOptions(app)), {
    methods: sendEmailMethods,
    events: []
  })

  app.service(sendEmailPath).hooks({
    around: {
      all: [
        schemaHooks.resolveExternal(sendEmailExternalResolver),
        schemaHooks.resolveResult(sendEmailResolver)
      ]
    },
    before: {
      all: [
        schemaHooks.validateQuery(sendEmailQueryValidator),
        schemaHooks.resolveQuery(sendEmailQueryResolver)
      ],
      create: [
        schemaHooks.validateData(sendEmailDataValidator),
        schemaHooks.resolveData(sendEmailDataResolver)
      ]
    },
    after: { all: [] },
    error: { all: [] }
  })
}

declare module '../../declarations' {
  interface ServiceTypes {
    [sendEmailPath]: SendEmailService
  }
}
