// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#custom-services
import type { Id, NullableId, Params, ServiceInterface } from '@feathersjs/feathers'

import type { Application } from '../../declarations'

const nodemailer = require("nodemailer");
import type {
  SendCertificate,
  SendCertificateData,
  SendCertificatePatch,
  SendCertificateQuery
} from './send-certificate.schema'
import { certificate } from '../../mail-templates/certificate';

export type { SendCertificate, SendCertificateData, SendCertificatePatch, SendCertificateQuery }

export interface SendCertificateServiceOptions {
  app: Application
}

export interface SendCertificateParams extends Params<SendCertificateQuery> {}

// This is a skeleton for a custom service class. Remove or add the methods you need here
export class SendCertificateService<ServiceParams extends SendCertificateParams = SendCertificateParams>
  implements ServiceInterface<SendCertificate, SendCertificateData, ServiceParams, SendCertificatePatch>
{
  constructor(public options: SendCertificateServiceOptions) {}

  async find(_params?: ServiceParams): Promise<SendCertificate[]> {
    return []
  }

  async get(id: Id, _params?: ServiceParams): Promise<SendCertificate> {
    return {
      id: 0,
      email: `Email for ${id}`,
      name: `Name for ${id}`,
      certificateUrl: `Certificate URL forr ${id}`
    }
  }


  async create(data: SendCertificateData, params?: ServiceParams): Promise<SendCertificate> {
    
    console.log('Sending email to:', data.email)

    const getTemplate = certificate(data.name, data.certificateUrl);

    try {
      //const accessToken = await oAuth2Client.getAccessToken()

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: 'imersao@42sp.org.br',
          clientId: process.env.CLIENT_ID,
          clientSecret: process.env.CLIENT_SECRET,
          refreshToken: process.env.REFRESH_TOKEN,
          //accessToken: 'ya29.a0AS3H6NzAYrfhJqBCIgZZ3gjkA4CUMmtVr8pJAazbZHG_chuzEzGVcDaTwfdcdVzjktLVnrxjATBz9VEMQT60YRyVYFjROpfSauUe8R6r5hDFBqMFyBLucESRAte7GcWrY2F8NJ9vv00iVsmjYKnnbiE76NGkoQceDGqVdfjbaCgYKAR0SARESFQHGX2MinybUW4-KJLlRkIGter5o6g0175'
        }
      })

      const mailOptions = {
        from: 'imersao@42sp.org.br',
        to: data.email, // assuming SendCertificateData has an 'email' field
        subject: 'Parabéns, Exploradores do Conhecimento!',
        //text: `Here is your certificate. ${data.certificateUrl}`,
        html:  getTemplate 
      }

      

      await transporter.sendMail(mailOptions)

      return {
      
        ...data,
      }
    } catch (error) {
      // Handle error as needed
      console.error('Error sending email:', error)
      return {
        email: data.email,
        name: data.name,
        certificateUrl: data.certificateUrl
      }
    }
  }

  // This method has to be added to the 'methods' option to make it available to clients
  async update(id: NullableId, data: SendCertificateData, _params?: ServiceParams): Promise<SendCertificate> {
    return {
      id: 0,
      ...data
    }
  }

  async patch(id: NullableId, data: SendCertificatePatch, _params?: ServiceParams): Promise<SendCertificate> {
    return {
      id: 0,
      email: `Email for ${id}`,
      name: `Name for ${id}`,
      certificateUrl: `Certificate URL for ${id}`
    }
  }

  async remove(id: NullableId, _params?: ServiceParams): Promise<SendCertificate> {
    return {
      id: 0,
      email: `Email for ${id}`,
      name: `Name for ${id}`,
      certificateUrl: `Certificate URL for ${id}`
    }
  }
}

export const getOptions = (app: Application) => {
  return { app }
}
