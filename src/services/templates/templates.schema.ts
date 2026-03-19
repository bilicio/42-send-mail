import { resolve, getValidator, querySyntax } from '@feathersjs/schema'
import type { FromSchema } from '@feathersjs/schema'

import type { HookContext } from '../../declarations'
import { dataValidator, queryValidator } from '../../validators'
import type { EmailTemplatesService } from './templates.class'

// Main data model schema
export const emailTemplateSchema = {
  $id: 'EmailTemplate',
  type: 'object',
  additionalProperties: false,
  required: ['name', 'subject', 'html_content', 'design_json'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    subject: { type: 'string' },
    html_content: { type: 'string' },
    design_json: { type: 'object' },
    variables: { type: 'array', items: { type: 'string' } },
    images: { type: 'array', items: { type: 'string' } },
    created_at: { type: 'string' },
    updated_at: { type: 'string' }
  }
} as const
export type EmailTemplate = FromSchema<typeof emailTemplateSchema>
export const emailTemplateValidator = getValidator(emailTemplateSchema, dataValidator)
export const emailTemplateResolver = resolve<EmailTemplate, HookContext<EmailTemplatesService>>({})

export const emailTemplateExternalResolver = resolve<EmailTemplate, HookContext<EmailTemplatesService>>(
  {}
)

// Schema for creating new data
export const emailTemplateDataSchema = {
  $id: 'EmailTemplateData',
  type: 'object',
  additionalProperties: false,
  required: ['name', 'subject', 'html_content', 'design_json'],
  properties: {
    name: { type: 'string' },
    subject: { type: 'string' },
    html_content: { type: 'string' },
    design_json: { type: 'object' },
    variables: { type: 'array', items: { type: 'string' } },
    images: { type: 'array', items: { type: 'string' } }
  }
} as const
export type EmailTemplateData = FromSchema<typeof emailTemplateDataSchema>
export const emailTemplateDataValidator = getValidator(emailTemplateDataSchema, dataValidator)
export const emailTemplateDataResolver = resolve<EmailTemplateData, HookContext<EmailTemplatesService>>(
  {}
)

// Schema for updating existing data
export const emailTemplatePatchSchema = {
  $id: 'EmailTemplatePatch',
  type: 'object',
  additionalProperties: false,
  required: [],
  properties: {
    name: { type: 'string' },
    subject: { type: 'string' },
    html_content: { type: 'string' },
    design_json: { type: 'object' },
    variables: { type: 'array', items: { type: 'string' } },
    images: { type: 'array', items: { type: 'string' } }
  }
} as const
export type EmailTemplatePatch = FromSchema<typeof emailTemplatePatchSchema>
export const emailTemplatePatchValidator = getValidator(emailTemplatePatchSchema, dataValidator)
export const emailTemplatePatchResolver = resolve<
  EmailTemplatePatch,
  HookContext<EmailTemplatesService>
>({})

// Schema for allowed query properties
export const emailTemplateQuerySchema = {
  $id: 'EmailTemplateQuery',
  type: 'object',
  additionalProperties: false,
  properties: {
    ...querySyntax({
      id: { type: 'string' },
      name: { type: 'string' }
    })
  }
} as const
export type EmailTemplateQuery = FromSchema<typeof emailTemplateQuerySchema>
export const emailTemplateQueryValidator = getValidator(emailTemplateQuerySchema, queryValidator)
export const emailTemplateQueryResolver = resolve<
  EmailTemplateQuery,
  HookContext<EmailTemplatesService>
>({})
