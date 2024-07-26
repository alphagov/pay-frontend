'use strict'

const logger = require('../../../utils/logger')(__filename)
const { getLoggingFields } = require('../../../utils/logging-fields-helper')
const axios = require('axios')
const https = require('https')
const { HttpsProxyAgent } = require('https-proxy-agent')
const proxyUrl = process.env.HTTPS_PROXY


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

  const options = {
    url: url,
    method: 'post',
    headers: { 'Content-Type': 'application/json' },
    data: {
      merchantIdentifier: merchantIdentityVars.merchantIdentifier,
      displayName: 'GOV.UK Pay',
      initiative: 'web',
      initiativeContext: process.env.APPLE_PAY_MERCHANT_DOMAIN
    },
    httpsAgent: proxyUrl ? proxyAgent : httpsAgent
  }

  try {
    let response

    if (proxyUrl) {
      response = await axios(options, httpsAgent)
    } else {
      response = await axios(options)
    }
    res.status(200).send(response.data)
  } catch (error) {
    logger.info('Error generating Apple Pay session', {
      ...getLoggingFields(req),
      error: error,
      response: error.response,
      data: error.response ? error.response.data : null
    })
    res.status(500).send(error.response ? error.response.data : 'Apple Pay Error')
  }
}
