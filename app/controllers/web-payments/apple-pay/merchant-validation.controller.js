'use strict'

const request = require('requestretry') // to be removed once axios is in use
const logger = require('../../../utils/logger')(__filename)
const { getLoggingFields } = require('../../../utils/logging-fields-helper')
const axios = require('axios')
const https = require('https')
const { HttpsProxyAgent } = require('https-proxy-agent')
const proxyUrl = process.env.HTTPS_PROXY
const applePayMerchantValidationViaAxios = process.env.APPLE_PAY_MERCHANT_VALIDATION_VIA_AXIOS === 'true'


function getCertificateMultiline (cert) {
  return `-----BEGIN CERTIFICATE-----
${cert}
-----END CERTIFICATE-----`
}

function getPrivateKeyMultiline (key) {
  return `-----BEGIN PRIVATE KEY-----
${key}
-----END PRIVATE KEY-----`
}

function getApplePayMerchantIdentityVariables (paymentProvider) {
  if (paymentProvider === 'worldpay' || paymentProvider === 'sandbox') {
    return {
      merchantIdentifier: process.env.WORLDPAY_APPLE_PAY_MERCHANT_ID,
      cert: getCertificateMultiline(process.env.WORLDPAY_APPLE_PAY_MERCHANT_ID_CERTIFICATE),
      key: getPrivateKeyMultiline(process.env.WORLDPAY_APPLE_PAY_MERCHANT_ID_CERTIFICATE_KEY)
    }
  } else if (paymentProvider === 'stripe') {
    return {
      merchantIdentifier: process.env.STRIPE_APPLE_PAY_MERCHANT_ID,
      cert: getCertificateMultiline(process.env.STRIPE_APPLE_PAY_MERCHANT_ID_CERTIFICATE),
      key: getPrivateKeyMultiline(process.env.STRIPE_APPLE_PAY_MERCHANT_ID_CERTIFICATE_KEY)
    }
  } else {
    logger.error(`Unexpected payment provider [${paymentProvider}] when getting Merchant Identity variables for Apple Pay`)
    return false
  }
}

// When an Apple payment is initiated in Safari, it must check that the request
// is coming from a registered and authorised Apple Merchant Account. The
// browser will produce a URL which we should dial with our certificates server side.
module.exports = async (req, res) => {

  if (!req.body.url) {
    return res.sendStatus(400)
  }
  const { url, paymentProvider } = req.body
  const merchantIdentityVars = getApplePayMerchantIdentityVariables(paymentProvider)
  if (!merchantIdentityVars) {
    return res.sendStatus(400)
  }

  const httpsAgent = new https.Agent({
    cert: merchantIdentityVars.cert,
    key: merchantIdentityVars.key
  });

  const proxyAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : null

  const options = applePayMerchantValidationViaAxios ?
    {
      url: url,
      method: 'post',
      cert: merchantIdentityVars.cert,
      key: merchantIdentityVars.key,
      headers: { 'Content-Type': 'application/json' },
      data: {
        merchantIdentifier: merchantIdentityVars.merchantIdentifier,
        displayName: 'GOV.UK Pay',
        initiative: 'web',
        initiativeContext: process.env.APPLE_PAY_MERCHANT_DOMAIN
      },
      httpsAgent: proxyUrl ? proxyAgent : httpsAgent
    } :
    {
      url: url,
      cert: merchantIdentityVars.cert,
      key: merchantIdentityVars.key,
      method: 'post',
      body: {
        merchantIdentifier: merchantIdentityVars.merchantIdentifier,
        displayName: 'GOV.UK Pay',
        initiative: 'web',
        initiativeContext: process.env.APPLE_PAY_MERCHANT_DOMAIN
      },
      json: true
    }

  if (applePayMerchantValidationViaAxios) {
    logger.info('Generating Apple Pay session via axios')
    try {
      let response

      if (proxyUrl) {
        response = await axios(options, httpsAgent)
      } else {
        response = await axios(options)
      }
      logger.info('Apple Pay session successfully generated via axios')
      res.status(200).send(response.data)
    } catch (error) {
      const errorResponseData = error.response ? error.response.data : null
      logger.info('Error generating Apple Pay session', {
        ...getLoggingFields(req),
        error: error,
        response: error.response,
        data: errorResponseData
      })
      logger.info('Apple Pay session via axios failed', errorResponseData ? errorResponseData : 'Apple Pay Error')
      res.status(500).send(errorResponseData ? errorResponseData : 'Apple Pay Error')
    }
  } else {
    logger.info('Generating Apple Pay session via request retry')
    request(options, (err, response, body) => {
      if (err) {
        logger.info('Error generating Apple Pay session', {
          ...getLoggingFields(req),
          error: err,
          response: response,
          body: body
        })
        logger.info('Apple Pay session via request retry failed', body)
        return res.status(500).send(body)
      }
      logger.info('Apple Pay session successfully generated via request retry')
      res.status(200).send(body)
    })
  }
}
