import type { Id, NullableId, Params, ServiceInterface } from '@feathersjs/feathers'
import { NotFound } from '@feathersjs/errors'
import type { Application } from '../../declarations'
import { pb } from '../../db'
import type {
  EmailTemplate,
  EmailTemplateData,
  EmailTemplatePatch,
  EmailTemplateQuery
} from './templates.schema'

export type { EmailTemplate, EmailTemplateData, EmailTemplatePatch, EmailTemplateQuery }

export interface EmailTemplatesServiceOptions {
  app: Application
}

export interface EmailTemplatesParams extends Params<EmailTemplateQuery> {}

// External image URL patterns that must be migrated to PocketBase
const EXTERNAL_IMAGE_PATTERN =
  /https?:\/\/[^\s"'<>]+(?:unlayer\.com|amazonaws\.com)[^\s"'<>]*/g

async function migrateImages(
  html: string,
  designJson: any
): Promise<{ html: string; designJson: any; imageIds: string[] }> {
  const pocketbaseUrl = (process.env.POCKETBASE_URL || '').replace(/\/$/, '')
  let htmlStr = html
  let designStr = JSON.stringify(designJson)

  // Collect unique external URLs not already on our server
  const externalUrls = new Set([
    ...(htmlStr.match(EXTERNAL_IMAGE_PATTERN) ?? []),
    ...(designStr.match(EXTERNAL_IMAGE_PATTERN) ?? [])
  ].filter((url) => !url.startsWith(pocketbaseUrl)))

  const imageIds: string[] = []

  for (const url of externalUrls) {
    try {
      const response = await fetch(url)
      if (!response.ok) continue

      const buffer = await response.arrayBuffer()
      const contentType = response.headers.get('content-type') || 'image/png'
      const ext = contentType.split('/')[1]?.split('+')[0] || 'png'
      const filename = `image-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const formData = new FormData()
      formData.append('name', filename)
      formData.append('file', new Blob([buffer], { type: contentType }), filename)

      const record = await pb.collection('template_images').create(formData)
      const pbUrl = `${pocketbaseUrl}/api/files/template_images/${record.id}/${record.file}`

      htmlStr = htmlStr.split(url).join(pbUrl)
      designStr = designStr.split(url).join(pbUrl)
      imageIds.push(record.id)
    } catch {
      // Skip images that can't be fetched/uploaded — keep original URL
    }
  }

  return { html: htmlStr, designJson: JSON.parse(designStr), imageIds }
}

export class EmailTemplatesService<
  ServiceParams extends EmailTemplatesParams = EmailTemplatesParams
> implements
    ServiceInterface<EmailTemplate, EmailTemplateData, ServiceParams, EmailTemplatePatch>
{
  constructor(public options: EmailTemplatesServiceOptions) {}

  async find(_params?: ServiceParams): Promise<EmailTemplate[]> {
    const records = await pb.collection('email_templates').getFullList({ sort: '-created' })
    return records.map(this._serialize)
  }

  async get(id: Id, _params?: ServiceParams): Promise<EmailTemplate> {
    try {
      const record = await pb.collection('email_templates').getOne(String(id))
      return this._serialize(record)
    } catch {
      throw new NotFound(`Template ${id} not found`)
    }
  }

  async create(data: EmailTemplateData, _params?: ServiceParams): Promise<EmailTemplate> {
    const { html, designJson, imageIds } = await migrateImages(
      data.html_content,
      data.design_json
    )

    const record = await pb.collection('email_templates').create({
      name: data.name,
      subject: data.subject,
      html_content: html,
      design_json: designJson,
      variables: data.variables ?? [],
      images: imageIds
    })
    return this._serialize(record)
  }

  async patch(id: NullableId, data: EmailTemplatePatch, _params?: ServiceParams): Promise<EmailTemplate> {
    const updateData: Record<string, any> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.subject !== undefined) updateData.subject = data.subject
    if (data.variables !== undefined) updateData.variables = data.variables

    if (data.html_content !== undefined || data.design_json !== undefined) {
      const current = await this.get(id as Id)
      const { html, designJson, imageIds } = await migrateImages(
        data.html_content ?? current.html_content,
        data.design_json ?? current.design_json
      )
      updateData.html_content = html
      updateData.design_json = designJson
      updateData.images = imageIds
    }

    try {
      const record = await pb.collection('email_templates').update(String(id), updateData)
      return this._serialize(record)
    } catch {
      throw new NotFound(`Template ${id} not found`)
    }
  }

  async remove(id: NullableId, _params?: ServiceParams): Promise<EmailTemplate> {
    const record = await this.get(id as Id)
    await pb.collection('email_templates').delete(String(id))
    return record
  }

  private _serialize(record: any): EmailTemplate {
    return {
      id: record.id,
      name: record.name,
      subject: record.subject,
      html_content: record.html_content,
      design_json: record.design_json,
      variables: record.variables ?? [],
      images: record.images ?? [],
      created_at: record.created,
      updated_at: record.updated
    }
  }
}

export const getOptions = (app: Application) => {
  return { app }
}
