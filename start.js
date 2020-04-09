const logger = require('./app/utils/logger')(__filename)
const server = require('./server')

logger.info(`[process.version=${process.version}] [NODE_VERSION=${process.env.NODE_VERSION}]`)
server.start()
