// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html

import { hooks as schemaHooks } from '@feathersjs/schema'

import {
  sendCertificateDataValidator,
  sendCertificatePatchValidator,
  sendCertificateQueryValidator,
  sendCertificateResolver,
  sendCertificateExternalResolver,
  sendCertificateDataResolver,
  sendCertificatePatchResolver,
  sendCertificateQueryResolver
} from './send-certificate.schema'

import type { Application } from '../../declarations'
import { SendCertificateService, getOptions } from './send-certificate.class'
import { sendCertificatePath, sendCertificateMethods } from './send-certificate.shared'

export * from './send-certificate.class'
export * from './send-certificate.schema'

// A configure function that registers the service and its hooks via `app.configure`
export const sendCertificate = (app: Application) => {
  // Register our service on the Feathers application
  app.use(sendCertificatePath, new SendCertificateService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: sendCertificateMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(sendCertificatePath).hooks({
    around: {
      all: [
        schemaHooks.resolveExternal(sendCertificateExternalResolver),
        schemaHooks.resolveResult(sendCertificateResolver)
      ]
    },
    before: {
      all: [
        schemaHooks.validateQuery(sendCertificateQueryValidator),
        schemaHooks.resolveQuery(sendCertificateQueryResolver)
      ],
      find: [],
      get: [],
      create: [
        schemaHooks.validateData(sendCertificateDataValidator),
        schemaHooks.resolveData(sendCertificateDataResolver)
      ],
      patch: [
        schemaHooks.validateData(sendCertificatePatchValidator),
        schemaHooks.resolveData(sendCertificatePatchResolver)
      ],
      remove: []
    },
    after: {
      all: []
    },
    error: {
      all: []
    }
  })
}

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    [sendCertificatePath]: SendCertificateService
  }
}
