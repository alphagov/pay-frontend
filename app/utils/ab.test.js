'use strict'

const cookie = require('./cookies')
const random = require('./random')
const crypto = require('crypto')
const logger = require('../utils/logger')(__filename)
const { getLoggingFields } = require('../utils/logging_fields_helper')

exports.uniformlyGeneratedRandomNumber = () => {
  // AFAIK node's Math.random function is not uniformly random
  // Hence the following dance
  //
  // 1. Generate a random number
  // 2. Hash it so it is uniformly distributed
  // 3. Modulo 100
  const abUuid = random.randomUuid()
  const hash = crypto.createHash('sha256')

  hash.update(abUuid)

  // We will Math.ceil our number so we don't have to check zeros
  const uniformHash = hash.digest('hex')
  const uniformNumber = parseInt(uniformHash, 16)
  const uniformModNumber = Math.ceil(uniformNumber % 100)

  return uniformModNumber
}

exports._getSession = req => {
  const sessionVal = cookie.getSessionVariable(req, 'abTestId')
  return sessionVal || null
}

exports._setSession = req => {
  return cookie.setSessionVariable(
    req,
    'abTestId',
    exports.uniformlyGeneratedRandomNumber()
  )
}

exports._getOrSetSession = req => {
  if (exports._getSession(req) === null) {
    logger.info('Could not find user ab testing session, creating one', getLoggingFields(req))
    exports._setSession(req)
  }
  return exports._getSession(req)
}

exports.switch = (opts, loggingFields = {}) => {
  const threshold = Math.floor(parseInt(opts.threshold, 10) || 100)
  const defaultVariant = opts.defaultVariant
  const testingVariant = opts.testingVariant

  return (req, res) => {
    const sessionValue = exports._getOrSetSession(req)

    const showABTest = req.query.abTest ? req.query.abTest === 'yes' : sessionValue > threshold

    if (showABTest) {
      logger.info(
        'Session value was %s, >= %s, showing testing variant',
        sessionValue,
        threshold,
        loggingFields
      )

      return testingVariant(req, res)
    } else {
      logger.info(
        'Session value was %s, <= %s, showing default variant',
        sessionValue,
        threshold,
        loggingFields
      )

      return defaultVariant(req, res)
    }
  }
}
