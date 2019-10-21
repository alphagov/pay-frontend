'use strict'

const cookie = require('./cookies')
const random = require('./random')
const crypto = require('crypto')
const logger = require('../utils/logger')(__filename)

exports.uniformlyGeneratedRandomNumber = () => {
  // AFAIK node's Math.random function is not uniformly random
  // Hence the following dance
  //
  // 1. Generate a random number
  // 2. Hash it so it is uniformly distributed
  // 3. Modulo 100
  let abUuid = random.randomUuid()
  let hash = crypto.createHash('sha256')

  hash.update(abUuid)

  // We will Math.ceil our number so we don't have to check zeros
  let uniformHash = hash.digest('hex')
  let uniformNumber = parseInt(uniformHash, 16)
  let uniformModNumber = Math.ceil(uniformNumber % 100)

  return uniformModNumber
}

exports._getSession = req => {
  let sessionVal = cookie.getSessionVariable(req, 'abTestId')
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
    logger.info('Could not find user ab testing session, creating one')
    exports._setSession(req)
  }
  return exports._getSession(req)
}

exports.switch = opts => {
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
        threshold
      )

      return testingVariant(req, res)
    } else {
      logger.info(
        'Session value was %s, <= %s, showing default variant',
        sessionValue,
        threshold
      )

      return defaultVariant(req, res)
    }
  }
}
