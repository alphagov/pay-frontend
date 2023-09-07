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
const normalise = require("../../services/normalise-charge");

module.exports = (req, res) => {
  const { chargeData, chargeId, params } = req
  const charge = normalise.charge(chargeData, chargeId)
  const wallet = params.provider

  const { worldpay3dsFlexDdcStatus } = req.body
  if (worldpay3dsFlexDdcStatus) {
    logging.worldpay3dsFlexDdcStatus(worldpay3dsFlexDdcStatus, getLoggingFields(req))
  }

  const payload = wallet === 'apple' ? normaliseApplePayPayload(req) : normaliseGooglePayPayload(req)

  const walletAuthOpts = {
    chargeId,
    wallet,
    paymentProvider: charge.paymentProvider,
    payload
  }
  return connectorClient({ correlationId: req.headers[CORRELATION_HEADER] }).chargeAuthWithWallet(walletAuthOpts, getLoggingFields(req))
    .then(data => {
      setSessionVariable(req, `ch_${(chargeId)}.webPaymentAuthResponse`, {
        statusCode: data.statusCode
      })
      logger.info(`Successful auth for ${wallet} Pay payment. ChargeID: ${chargeId}`, getLoggingFields(req))
      res.status(200)
      res.send({ url: `/handle-payment-response/${chargeId}` })
    })
    .catch(err => {
      logger.error(`Error while trying to authorise ${wallet} Pay payment`, {
        ...getLoggingFields(req),
        error: err
      })
      res.status(200)
      res.send({ url: `/handle-payment-response/${chargeId}` })
    })
}
