import multer from 'multer'
import type { Application } from '../../declarations'
import { TemplateImagesService, getOptions } from './template-images.class'

export * from './template-images.class'

export const templateImagesPath = 'template-images'

const upload = multer({ storage: multer.memoryStorage() })

// Middleware that runs multer and copies req.file into req.feathers
// so Feathers spreads it into context.params (via ...req.feathers)
const multerMiddleware = (req: any, res: any, next: any) => {
  if (req.method === 'POST') {
    upload.single('file')(req, res, (err: any) => {
      if (err) return next(err)
      req.feathers = req.feathers || {}
      req.feathers.file = req.file
      next()
    })
  } else {
    next()
  }
}

export const templateImages = (app: Application) => {
  // Pass multerMiddleware inline so it runs inside the Feathers REST handler,
  // not as a separate app.use() that the REST handler bypasses.
  ;(app as any).use(templateImagesPath, multerMiddleware, new TemplateImagesService(getOptions(app)), {
    methods: ['find', 'get', 'create', 'remove'],
    events: []
  })

  app.service(templateImagesPath).hooks({
    before: {
      create: [
        async (context) => {
          const file = (context.params as any).file
          if (file) {
            context.data = { ...context.data, _file: file }
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
