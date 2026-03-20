import { sendCertificate } from './send-certificate/send-certificate'
import { emailTemplates } from './templates/templates'
import { sendEmail } from './send-email/send-email'
import { templateImages } from './template-images/template-images'
import { emailLogs } from './email-logs/email-logs'
// For more information about this file see https://dove.feathersjs.com/guides/cli/application.html#configure-functions
import type { Application } from '../declarations'

export const services = (app: Application) => {
  app.configure(sendCertificate)
  app.configure(emailTemplates)
  app.configure(sendEmail)
  app.configure(templateImages)
  app.configure(emailLogs)
  // All services will be registered here
}
