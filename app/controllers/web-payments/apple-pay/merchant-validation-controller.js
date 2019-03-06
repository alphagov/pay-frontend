'use strict'

// NPM dependencies
const request = require('requestretry')
const logger = require('winston')

// Local constants
const { APPLE_PAY_MERCHANT_ID, APPLE_PAY_MERCHANT_DOMAIN, APPLE_PAY_MERCHANT_ID_CERTIFICATE, APPLE_PAY_MERCHANT_ID_CERTIFICATE_KEY } = process.env

const generateMultiLineCertOrKey = (secret, type = 'cert') => {
  const noun = type === 'cert' ? 'CERTIFICATE' : 'PRIVATE KEY'
  return [
    `-----BEGIN ${noun}-----`,
    secret,
    `-----END ${noun}-----`
  ].join('\n')
}

// When an Apple payment is initiated in Safari, it must check that the request
// is coming from an registered and authorised Apple Merchant Account. The
// browser will produce a url which we should post our certificates to this
// this must occur server side.
module.exports = (req, res) => {
  if (!req.body.url) {
    return res.sendStatus(400)
  }

  const options = {
    url: req.body.url,
    cert: generateMultiLineCertOrKey(APPLE_PAY_MERCHANT_ID_CERTIFICATE),
    key: generateMultiLineCertOrKey(APPLE_PAY_MERCHANT_ID_CERTIFICATE_KEY, 'key'),
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
