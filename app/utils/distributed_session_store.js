'use strict'

const CHARGE_KEY_LENGTH_SECONDS = 10 * 60

const redis = require('redis').redisClient
const logger = require('winston')
const q = require('q')

function chargeIdKey (userId, chargeId) {
  return `${userId}:${chargeId}`
}

exports.doesUserHaveChargeId = (req, userId, chargeId) => {
  return q.fcall(redis.get, chargeIdKey(userId, chargeId))
  .then((err, value) => {
    if (err) throw err

    const isPresent = value !== null

    logger.info('Result of looking for chargeId in distributed session -', {
      isPresent,
      userId,
      chargeId
    })

    return isPresent
  })
  .catch(err => {
    logger.error(
      'Received error fetching chargeId in distributed session -',
      { err, userId, chargeId }
     )
    throw err
  })
}

exports.giveUserChargeId = (req, userId, chargeId) => {
  // NX = only set key if it does not already exist
  return q.fcall(
    redis.set,
    chargeIdKey(userId, chargeId),
    'present',
    'NX',
    CHARGE_KEY_LENGTH_SECONDS
  )
  .then((err, value) => {
    if (err) throw err
    return true
  })
  .catch(err => {
    logger.error(
      'Received error setting chargeId in distributed session -',
      { err, userId, chargeId }
     )
    throw err
  })
}
