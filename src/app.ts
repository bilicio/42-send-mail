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
import type { Application } from './declarations'
import { configurationValidator } from './configuration'
import { logger } from './logger'
import { logError } from './hooks/log-error'
import { services } from './services/index'
import { channels } from './channels'
import { pb } from './db'

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
app.use(json())
app.use(urlencoded({ extended: true }))
// Host the public folder
app.use('/', serveStatic(app.get('public')))

// ── Public API: GET /get-templates ────────────────────────────────────────────
;(app as any).get('/get-templates', async (_req: any, res: any) => {
  try {
    const records = await pb.collection('email_templates').getFullList({ sort: '-created' })
    const templates = records.map((r: any) => ({
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
      origin: app.get('origins')
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
  before: {},
  after: {},
  error: {}
})
// Register application setup and teardown hooks here
app.hooks({
  setup: [],
  teardown: []
})

export { app }
