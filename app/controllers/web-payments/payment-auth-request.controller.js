'use strict'

// NPM dependencies
const logger = require('../../utils/logger')(__filename)
const logging = require('../../utils/logging')
const { getLoggingFields } = require('../../utils/logging-fields-helper')
const connectorClient = require('../../services/clients/connector.client')
const normaliseApplePayPayload = require('./apple-pay/normalise-apple-pay-payload')
const normaliseGooglePayPayload = require('./google-pay/normalise-google-pay-payload')
const { CORRELATION_HEADER } = require('../../../config/correlation-header')
const { setSessionVariable } = require('../../utils/cookies')

module.exports = (req, res) => {
  const { chargeId, params } = req
  const { provider } = params

  const { worldpay3dsFlexDdcStatus } = req.body
  if (worldpay3dsFlexDdcStatus) {
    logging.worldpay3dsFlexDdcStatus(worldpay3dsFlexDdcStatus, getLoggingFields(req))
  }

  const payload = provider === 'apple' ? normaliseApplePayPayload(req) : normaliseGooglePayPayload(req)

  return connectorClient({ correlationId: req.headers[CORRELATION_HEADER] }).chargeAuthStripeGooglePay({ chargeId, provider, payload }, getLoggingFields(req))
    .then(data => {
      setSessionVariable(req, `ch_${(chargeId)}.webPaymentAuthResponse`, {
        statusCode: data.statusCode
      })
      logger.info(`Successful auth for ${provider} Pay payment. ChargeID: ${chargeId}`, getLoggingFields(req))
      res.status(200)
      res.send({ url: `/handle-payment-response/${chargeId}` })
    })
    .catch(err => {
      logger.error(`Error while trying to authorise ${provider} Pay payment`, {
        ...getLoggingFields(req),
        error: err
      })
      res.status(200)
      res.send({ url: `/handle-payment-response/${chargeId}` })
    })
}
