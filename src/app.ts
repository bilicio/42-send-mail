// For more information about this file see https://dove.feathersjs.com/guides/cli/application.html
import { feathers } from '@feathersjs/feathers'
import express, {
  rest,
  json,
  urlencoded,
  cors,
  serveStatic,
  notFound,
  errorHandler
} from '@feathersjs/express'
import configuration from '@feathersjs/configuration'
import socketio from '@feathersjs/socketio'
import { randomUUID } from 'node:crypto'
import multer from 'multer'
import type { Application } from './declarations'
import { configurationValidator } from './configuration'
import { logger } from './logger'
import { logError } from './hooks/log-error'
import { services } from './services/index'
import { channels } from './channels'
import { pb } from './db'
import { isExampleTemplate } from './utils/template'
import { auth, requireAuth } from './auth'
import { NotAuthenticated } from '@feathersjs/errors'

const app: Application = express(feathers())

// Load app configuration
app.configure(configuration(configurationValidator))

app.use(
  cors({
    origin: (_origin: any, cb: (...args: any[]) => void) => cb(null, true),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 204
  })
)
// 10 MB is comfortably above the largest Unlayer stock template (~200 KB) plus
// serialized design_json, without opening the door for accidental huge uploads.
app.use(json({ limit: '10mb' }))
app.use(urlencoded({ extended: true, limit: '10mb' }))
// Host the public folder
app.use('/', serveStatic(app.get('public')))

// ── Login do painel ───────────────────────────────────────────────────────────
// Rotas usadas só pelo painel exigem o token de login (ver src/auth.ts). Ficam
// abertas as que outros apps da 42 consomem: /send-email, /send-certificate,
// /get-templates e POST /email-logs/query.
app.configure(auth)
const PROTECTED_SERVICES = ['templates', 'template-images']
for (const path of ['/upload-slot', '/template-thumbnails', ...PROTECTED_SERVICES.map((p) => `/${p}`)]) {
  app.use(path, requireAuth)
}
app.use('/email-logs', (req: any, res: any, next: any) =>
  req.method === 'GET' ? requireAuth(req, res, next) : next()
)
// ──────────────────────────────────────────────────────────────────────────────

// ── Unlayer image upload interception ─────────────────────────────────────────
// Unlayer's editor calls api.unlayer.com/v2/images/upload-url to get a presigned
// S3 URL, then POSTs a FormData with the file to that URL and reads the final
// image URL from <Location> in the XML response.
// We intercept the upload-url call in customJS and redirect the POST here.
const _uploadMulter = multer({ storage: multer.memoryStorage() })

app.post('/upload-slot', _uploadMulter.single('file'), async (req: any, res: any) => {
  try {
    const file = req.file as Express.Multer.File | undefined
    if (!file) {
      return res.status(400).send('No file received')
    }

    const contentType = file.mimetype || 'image/png'
    const ext = (contentType.split('/')[1] || 'png').split('+')[0]
    const filename = `image-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`

    const formData = new FormData()
    formData.append('name', filename)
    formData.append('file', new Blob([file.buffer], { type: contentType }), filename)
    const record = await pb.collection('template_images').create(formData)
    const pocketbaseUrl = (process.env.POCKETBASE_URL || '').replace(/\/$/, '')
    const pbUrl = `${pocketbaseUrl}/api/files/template_images/${record.id}/${(record as any).file}`

    // Return S3-compatible XML so Unlayer reads the URL from <Location>
    res.set('Content-Type', 'application/xml')
    res.send(`<?xml version="1.0" encoding="UTF-8"?><PostResponse><Location>${pbUrl}</Location></PostResponse>`)
  } catch (err: any) {
    logger.error('[upload-slot] Error: %O', err)
    res.status(500).send('Upload failed')
  }
})
// ──────────────────────────────────────────────────────────────────────────────

// ── Thumbnail upload: POST /template-thumbnails ───────────────────────────────
// Same PocketBase-backed upload as /upload-slot, but returns JSON so the
// frontend can read the resulting URL directly. Used by the editor's "Save as
// example" checkbox to persist a preview image alongside the template.
app.post('/template-thumbnails', _uploadMulter.single('file'), async (req: any, res: any) => {
  try {
    const file = req.file as Express.Multer.File | undefined
    if (!file) {
      return res.status(400).json({ error: 'No file received' })
    }
    const contentType = file.mimetype || 'image/png'
    const ext = (contentType.split('/')[1] || 'png').split('+')[0]
    const filename = (req.body?.name as string | undefined) ||
      `thumb-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`

    const formData = new FormData()
    formData.append('name', filename)
    formData.append('file', new Blob([file.buffer], { type: contentType }), filename)
    const record = await pb.collection('template_images').create(formData)
    const pocketbaseUrl = (process.env.POCKETBASE_URL || '').replace(/\/$/, '')
    const url = `${pocketbaseUrl}/api/files/template_images/${record.id}/${(record as any).file}`

    res.json({ id: record.id, url, name: filename })
  } catch (err: any) {
    logger.error('[template-thumbnails] %O', err)
    res.status(500).json({ error: 'Upload failed' })
  }
})
// ──────────────────────────────────────────────────────────────────────────────

// ── Public API: GET /get-templates ────────────────────────────────────────────
// Só templates criados normalmente ou clonados de um exemplo — os exemplos da
// galeria são modelos de partida e não devem ser usados para envio.
;(app as any).get('/get-templates', async (_req: any, res: any) => {
  try {
    const records = await pb.collection('email_templates').getFullList({ sort: '-created' })
    const templates = records.filter((r: any) => !isExampleTemplate(r)).map((r: any) => ({
      id: r.id,
      name: r.name,
      subject: r.subject,
      variables: r.variables ?? []
    }))
    res.json(templates)
  } catch (err: any) {
    logger.error('[get-templates] %O', err)
    res.status(500).json({ error: 'Failed to fetch templates' })
  }
})
// ──────────────────────────────────────────────────────────────────────────────

// Configure services and real-time functionality
app.configure(rest())
app.configure(
  socketio({
    cors: {
      // ALLOWED_ORIGINS no .env (separadas por vírgula) substitui o config.
      origin: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
        : app.get('origins')
    }
  })
)
app.configure(services)
app.configure(channels)

// Configure a middleware for 404s and the error handler
app.use(notFound())
app.use(errorHandler({ logger }))

// Register hooks that run on all service methods
app.hooks({
  around: {
    all: [logError]
  },
  before: {
    // O middleware acima só cobre REST; pelo websocket esses serviços ficam
    // fechados (o painel não usa socket).
    all: [
      async (context) => {
        if (context.params.provider === 'socketio' && PROTECTED_SERVICES.includes(context.path)) {
          throw new NotAuthenticated('Não autenticado')
        }
      }
    ]
  },
  after: {},
  error: {}
})
// Register application setup and teardown hooks here
app.hooks({
  setup: [],
  teardown: []
})

export { app }
