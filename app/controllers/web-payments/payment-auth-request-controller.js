'use strict'

// NPM dependencies
const logger = require('../../utils/logger')(__filename)
const { getLoggingFields } = require('../../utils/logging_fields_helper')
const connectorClient = require('../../services/clients/connector_client')
const normaliseApplePayPayload = require('./apple-pay/normalise-apple-pay-payload')
const normaliseGooglePayPayload = require('./google-pay/normalise-google-pay-payload')
const { CORRELATION_HEADER } = require('../../../config/correlation_header')
const { setSessionVariable } = require('../../utils/cookies')
const State = require('../../../config/state')
const paths = require('../../paths')

module.exports = (req, res) => {
  const { chargeId, params } = req
  const { provider } = params
  const payload = provider === 'apple' ? normaliseApplePayPayload(req) : normaliseGooglePayPayload(req)
  return connectorClient({ correlationId: req.headers[CORRELATION_HEADER] })
    .chargeAuthWithWallet({ chargeId, provider, payload }, getLoggingFields(req))
    .then(data => {
      setSessionVariable(req, `ch_${(chargeId)}.webPaymentAuthResponse`, {
        statusCode: data.statusCode
      })
      res.status(200)

      if (data.body.status === State.AUTH_3DS_REQUIRED) {
        logger.info('Requesting 3DS1 for Google payment.', getLoggingFields(req))
        var auth3dsPath = paths.generateRoute('card.auth3dsRequired', { chargeId: chargeId })
        res.send({ url: auth3dsPath })
      } else {
        logger.info(`Successful auth for ${provider} Pay payment. ChargeID: ${chargeId}`, getLoggingFields(req))
        res.send({ url: `/handle-payment-response/${chargeId}` })
      }

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
