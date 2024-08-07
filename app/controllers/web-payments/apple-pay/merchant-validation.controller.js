'use strict'

const request = require('requestretry') // to be removed once axios is in use
const logger = require('../../../utils/logger')(__filename)
const { getLoggingFields } = require('../../../utils/logging-fields-helper')
const axios = require('axios')
const { HttpsProxyAgent } = require('hpagent')
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

  const httpsAgent = new HttpsProxyAgent({
      proxy: proxyUrl,
      cert: merchantIdentityVars.cert,
      key: merchantIdentityVars.key
  })

  const axiosInstance = axios.create({ httpsAgent, proxy: false });

  if (proxyUrl) {
    logger.info('Using proxy URL')
  }

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
      httpsAgent: httpsAgent
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
    if (proxyUrl) {
      logger.info('Generating Apple Pay session via axios and https proxy agent (hpagent)')

      const data = {
        merchantIdentifier: merchantIdentityVars.merchantIdentifier,
        displayName: 'GOV.UK Pay',
        initiative: 'web',
        initiativeContext: process.env.APPLE_PAY_MERCHANT_DOMAIN
      }

      try {
        const response = await axiosInstance.post(url, data, { headers: { 'Content-Type': 'application/json; charset=utf-8' } })

        logger.info('Apple Pay session successfully generated via axios and https proxy agent (hpagent)')
        res.status(200).send(response.data)
      } catch (error) {
        logger.info('Error generating Apple Pay session with axios and https proxy agent (hpagent)', {
          ...getLoggingFields(req),
          error: error.message,
          status: error.response ? error.response.status : 'No status'
        })
        logger.info('Apple Pay session via axios and https proxy agent (hpagent) failed', 'Apple Pay Error')
        res.status(500).send('Apple Pay Error')
      }
    } else {
      logger.info('Generating Apple Pay session via axios and https proxy agent (hpagent) (NO PROXY)')
      try {
        const response = await axios(options)

        logger.info('Apple Pay session successfully generated via axios and https proxy agent (hpagent) (NO PROXY)')
        res.status(200).send(response.data)
      } catch (error) {
        logger.info('Error generating Apple Pay session (NO PROXY)', {
          ...getLoggingFields(req),
          error: error.message
        })
        logger.info('Apple Pay session via axios and https proxy agent (hpagent) with no proxy failed', 'Apple Pay Error')
        res.status(500).send('Apple Pay Error')
      }
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
