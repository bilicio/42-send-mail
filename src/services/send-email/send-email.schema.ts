import { resolve, getValidator, querySyntax } from '@feathersjs/schema'
import type { FromSchema } from '@feathersjs/schema'

import type { HookContext } from '../../declarations'
import { dataValidator, queryValidator } from '../../validators'
import type { SendEmailService } from './send-email.class'

// Main result schema
export const sendEmailSchema = {
  $id: 'SendEmail',
  type: 'object',
  additionalProperties: false,
  required: ['templateId', 'to', 'variables'],
  properties: {
    templateId: { type: 'string' },
    to: { type: 'string' },
    subject: { type: 'string' },
    variables: { type: 'object' }
  }
} as const
export type SendEmail = FromSchema<typeof sendEmailSchema>
export const sendEmailValidator = getValidator(sendEmailSchema, dataValidator)
export const sendEmailResolver = resolve<SendEmail, HookContext<SendEmailService>>({})
export const sendEmailExternalResolver = resolve<SendEmail, HookContext<SendEmailService>>({})

// Schema for create payload
export const sendEmailDataSchema = {
  $id: 'SendEmailData',
  type: 'object',
  additionalProperties: false,
  required: ['templateId', 'to', 'variables'],
  properties: {
    templateId: { type: 'string' },
    to: { type: 'string' },
    subject: { type: 'string' },
    variables: { type: 'object' }
  }
} as const
export type SendEmailData = FromSchema<typeof sendEmailDataSchema>
export const sendEmailDataValidator = getValidator(sendEmailDataSchema, dataValidator)
export const sendEmailDataResolver = resolve<SendEmailData, HookContext<SendEmailService>>({})

// Patch and Query schemas (unused but required for interface)
export const sendEmailPatchSchema = {
  $id: 'SendEmailPatch',
  type: 'object',
  additionalProperties: false,
  required: [],
  properties: {}
} as const
export type SendEmailPatch = FromSchema<typeof sendEmailPatchSchema>
export const sendEmailPatchValidator = getValidator(sendEmailPatchSchema, dataValidator)
export const sendEmailPatchResolver = resolve<SendEmailPatch, HookContext<SendEmailService>>({})

export const sendEmailQuerySchema = {
  $id: 'SendEmailQuery',
  type: 'object',
  additionalProperties: false,
  properties: {}
} as const
export type SendEmailQuery = FromSchema<typeof sendEmailQuerySchema>
export const sendEmailQueryValidator = getValidator(sendEmailQuerySchema, queryValidator)
export const sendEmailQueryResolver = resolve<SendEmailQuery, HookContext<SendEmailService>>({})
