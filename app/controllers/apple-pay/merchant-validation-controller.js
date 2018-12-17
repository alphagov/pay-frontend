'use strict'

// NPM dependencies
const request = require('requestretry')
const logger = require('winston')

// Local constants
const { APPLE_PAY_MERCHANT_ID, APPLE_PAY_MERCHANT_DOMAIN, APPLE_PAY_MERCHANT_ID_CERTIFICATE, APPLE_PAY_MERCHANT_ID_CERTIFICATE_KEY } = process.env

// When an Apple payment is initiated in Safari, it must check that the request
// is coming from an registered and authoriesed Apple Merchant Account. The
// browser will produce a url which we should dial with our certificates server side.
module.exports = (req, res) => {
  if (!req.body.url) {
    return res.sendStatus(400)
  }

  const options = {
    url: req.body.url,
    cert: APPLE_PAY_MERCHANT_ID_CERTIFICATE,
    key: APPLE_PAY_MERCHANT_ID_CERTIFICATE_KEY,
    method: 'post',
    body: {
      merchantIdentifier: APPLE_PAY_MERCHANT_ID,
      displayName: 'GOV.UK Pay',
      initiative: 'web',
      initiativeContext: APPLE_PAY_MERCHANT_DOMAIN
    },
    json: true
  }

  request(options, (err, response, body) => {
    if (err) {
      logger.info('Error generating Apple Pay session')
      logger.info(err, response, body)
      res.status(500).send(body)
    }
    res.status(200).send(body)
  })
}
