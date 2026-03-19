import { hooks as schemaHooks } from '@feathersjs/schema'

import {
  emailTemplateDataValidator,
  emailTemplatePatchValidator,
  emailTemplateQueryValidator,
  emailTemplateResolver,
  emailTemplateExternalResolver,
  emailTemplateDataResolver,
  emailTemplatePatchResolver,
  emailTemplateQueryResolver
} from './templates.schema'

import type { Application } from '../../declarations'
import { EmailTemplatesService, getOptions } from './templates.class'
import { emailTemplatesPath, emailTemplatesMethods } from './templates.shared'

export * from './templates.class'
export * from './templates.schema'

export const emailTemplates = (app: Application) => {
  app.use(emailTemplatesPath, new EmailTemplatesService(getOptions(app)), {
    methods: emailTemplatesMethods,
    events: []
  })

  app.service(emailTemplatesPath).hooks({
    around: {
      all: [
        schemaHooks.resolveExternal(emailTemplateExternalResolver),
        schemaHooks.resolveResult(emailTemplateResolver)
      ]
    },
    before: {
      all: [
        schemaHooks.validateQuery(emailTemplateQueryValidator),
        schemaHooks.resolveQuery(emailTemplateQueryResolver)
      ],
      find: [],
      get: [],
      create: [
        schemaHooks.validateData(emailTemplateDataValidator),
        schemaHooks.resolveData(emailTemplateDataResolver)
      ],
      patch: [
        schemaHooks.validateData(emailTemplatePatchValidator),
        schemaHooks.resolveData(emailTemplatePatchResolver)
      ],
      remove: []
    },
    after: { all: [] },
    error: { all: [] }
  })
}

declare module '../../declarations' {
  interface ServiceTypes {
    [emailTemplatesPath]: EmailTemplatesService
  }
}
