// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve, getValidator, querySyntax } from '@feathersjs/schema'
import type { FromSchema } from '@feathersjs/schema'

import type { HookContext } from '../../declarations'
import { dataValidator, queryValidator } from '../../validators'
import type { SendCertificateService } from './send-certificate.class'

// Main data model schema
export const sendCertificateSchema = {
  $id: 'SendCertificate',
  type: 'object',
  additionalProperties: false,
  required: ['email', 'name', 'certificateUrl'],
  properties: {
    id: { type: 'number' },
    email: { type: 'string' },
    name: { type: 'string' },
    certificateUrl: { type: 'string' }
  }
} as const
export type SendCertificate = FromSchema<typeof sendCertificateSchema>
export const sendCertificateValidator = getValidator(sendCertificateSchema, dataValidator)
export const sendCertificateResolver = resolve<SendCertificate, HookContext<SendCertificateService>>({})

export const sendCertificateExternalResolver = resolve<SendCertificate, HookContext<SendCertificateService>>(
  {}
)

// Schema for creating new data
export const sendCertificateDataSchema = {
  $id: 'SendCertificateData',
  type: 'object',
  additionalProperties: false,
  required: ['email', 'name', 'certificateUrl'],
  properties: {
    ...sendCertificateSchema.properties
  }
} as const
export type SendCertificateData = FromSchema<typeof sendCertificateDataSchema>
export const sendCertificateDataValidator = getValidator(sendCertificateDataSchema, dataValidator)
export const sendCertificateDataResolver = resolve<SendCertificateData, HookContext<SendCertificateService>>(
  {}
)

// Schema for updating existing data
export const sendCertificatePatchSchema = {
  $id: 'SendCertificatePatch',
  type: 'object',
  additionalProperties: false,
  required: [],
  properties: {
    ...sendCertificateSchema.properties
  }
} as const
export type SendCertificatePatch = FromSchema<typeof sendCertificatePatchSchema>
export const sendCertificatePatchValidator = getValidator(sendCertificatePatchSchema, dataValidator)
export const sendCertificatePatchResolver = resolve<
  SendCertificatePatch,
  HookContext<SendCertificateService>
>({})

// Schema for allowed query properties
export const sendCertificateQuerySchema = {
  $id: 'SendCertificateQuery',
  type: 'object',
  additionalProperties: false,
  properties: {
    ...querySyntax(sendCertificateSchema.properties)
  }
} as const
export type SendCertificateQuery = FromSchema<typeof sendCertificateQuerySchema>
export const sendCertificateQueryValidator = getValidator(sendCertificateQuerySchema, queryValidator)
export const sendCertificateQueryResolver = resolve<
  SendCertificateQuery,
  HookContext<SendCertificateService>
>({})
