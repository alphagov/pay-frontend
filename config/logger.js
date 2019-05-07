'use strict'

const winston = require('winston')

const devConfig = {
  level: winston.level.debug,
  format: winston.format.simple(),
  transports: [
    new winston.transports.Console()
  ]
}

const prodConfig = {
  level: winston.level.info,
  format: winston.format.json(),
  transports: [
    new winston.transports.Console()
  ]
}

const logger = winston.createLogger(process.env.NODE_ENV !== 'production' ? devConfig : prodConfig)

module.exports = logger
