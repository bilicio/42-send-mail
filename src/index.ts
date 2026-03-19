import 'dotenv/config'
import { app } from './app'
import { logger } from './logger'
import { authenticatePocketBase } from './db'

const port = app.get('port')
const host = app.get('host')

process.on('unhandledRejection', reason => logger.error('Unhandled Rejection %O', reason))

authenticatePocketBase()
  .then(() => app.listen(port))
  .then(() => {
    logger.info(`Feathers app listening on http://${host}:${port}`)
  })
  .catch(err => {
    logger.error('Failed to start server: %O', err)
    process.exit(1)
  })
