'use strict'

// NPM dependencies
const logger = require('winston')

// Local constants
const { APPLE_PAY_MERCHANT_ID_DOMAIN_ASSOCIATION } = process.env

module.exports = (req, res) => {
  if (APPLE_PAY_MERCHANT_ID_DOMAIN_ASSOCIATION.length === 0) {
    logger.warn(`Apple Pay domain assocation returned 404 as the environment variable was not set`)
    return res.sendStatus(404)
  }

  res.status(200).send(APPLE_PAY_MERCHANT_ID_DOMAIN_ASSOCIATION)
}
