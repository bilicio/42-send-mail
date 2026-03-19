import type { Id, NullableId, Params, ServiceInterface } from '@feathersjs/feathers'
import { BadRequest, NotFound } from '@feathersjs/errors'
import type { Application } from '../../declarations'
import { pb } from '../../db'

export interface TemplateImage {
  id: string
  name: string
  alt: string
  url: string
  created_at: string
  updated_at: string
}

export interface TemplateImageData {
  name?: string
  alt?: string
  _file?: Express.Multer.File
}

export interface TemplateImageQuery {}

export interface TemplateImagesServiceOptions {
  app: Application
}

export interface TemplateImagesParams extends Params<TemplateImageQuery> {}

export class TemplateImagesService<
  ServiceParams extends TemplateImagesParams = TemplateImagesParams
> implements ServiceInterface<TemplateImage, TemplateImageData, ServiceParams, any>
{
  constructor(public options: TemplateImagesServiceOptions) {}

  async find(_params?: ServiceParams): Promise<TemplateImage[]> {
    const records = await pb.collection('template_images').getFullList({ sort: '-created' })
    return records.map(this._serialize.bind(this))
  }

  async get(id: Id, _params?: ServiceParams): Promise<TemplateImage> {
    try {
      const record = await pb.collection('template_images').getOne(String(id))
      return this._serialize(record)
    } catch {
      throw new NotFound(`Image ${id} not found`)
    }
  }

  async create(data: TemplateImageData, _params?: ServiceParams): Promise<TemplateImage> {
    const file = data._file
    if (!file) throw new BadRequest('No file provided')
    const formData = new FormData()

    formData.append('name', data.name || file.originalname)
    formData.append('alt', data.alt || '')
    formData.append('file', new Blob([file.buffer], { type: file.mimetype }), file.originalname)

    const record = await pb.collection('template_images').create(formData)
    return this._serialize(record)
  }

  async remove(id: NullableId, _params?: ServiceParams): Promise<TemplateImage> {
    const record = await this.get(id as Id)
    await pb.collection('template_images').delete(String(id))
    return record
  }

  private _serialize(record: any): TemplateImage {
    const baseUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090'
    return {
      id: record.id,
      name: record.name,
      alt: record.alt ?? '',
      url: `${baseUrl}/api/files/template_images/${record.id}/${record.file}`,
      created_at: record.created,
      updated_at: record.updated
    }
  }
}

export const getOptions = (app: Application) => {
  return { app }
}
