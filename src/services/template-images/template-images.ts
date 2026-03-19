import multer from 'multer'
import type { Application } from '../../declarations'
import { TemplateImagesService, getOptions } from './template-images.class'

export * from './template-images.class'

export const templateImagesPath = 'template-images'

const upload = multer({ storage: multer.memoryStorage() })

export const templateImages = (app: Application) => {
  // Multer runs only on POST before the Feathers service picks up the request
  app.use(`/${templateImagesPath}`, (req: any, res: any, next: any) => {
    if (req.method === 'POST') {
      upload.single('file')(req, res, next)
    } else {
      next()
    }
  })

  app.use(templateImagesPath, new TemplateImagesService(getOptions(app)), {
    methods: ['find', 'get', 'create', 'remove'],
    events: []
  })

  app.service(templateImagesPath).hooks({
    before: {
      create: [
        async (context) => {
          const req = (context.params as any).req
          if (req?.file) {
            context.data = { ...context.data, _file: req.file }
          }
        }
      ]
    }
  })
}

declare module '../../declarations' {
  interface ServiceTypes {
    [templateImagesPath]: TemplateImagesService
  }
}
