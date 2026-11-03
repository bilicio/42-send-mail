import 'dotenv/config'
import { app } from './app'
import { logger } from './logger'
import { authenticatePocketBase } from './db'
import { ensureCodeTemplate } from './auth'

const port = app.get('port')
const host = app.get('host')

process.on('unhandledRejection', reason => logger.error('Unhandled Rejection %O', reason))

authenticatePocketBase()
  .then(() => app.listen(port))
  .then(() => {
    logger.info(`Feathers app listening on http://${host}:${port}`)
    // Deixa o template do código pronto e o ID visível no log de startup.
    ensureCodeTemplate()
      .then((id) => logger.info(`[auth] template do código de acesso: ${id}`))
      .catch((err) => logger.warn('[auth] não foi possível preparar o template do código: %O', err))
  })
  .catch(err => {
    logger.error('Failed to start server: %O', err)
    process.exit(1)
  })
