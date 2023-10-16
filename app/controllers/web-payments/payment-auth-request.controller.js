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
const normalise = require('../../services/normalise-charge')

module.exports = (req, res, next) => {
  const { chargeData, chargeId, params } = req
  const charge = normalise.charge(chargeData, chargeId)
  const wallet = params.provider
  const paymentProvider = charge.paymentProvider
  let payload

  const { worldpay3dsFlexDdcStatus } = req.body
  if (worldpay3dsFlexDdcStatus) {
    logging.worldpay3dsFlexDdcStatus(worldpay3dsFlexDdcStatus, getLoggingFields(req))
  }
  try {
    payload = wallet === 'apple' ? normaliseApplePayPayload(req) : normaliseGooglePayPayload(req, paymentProvider)
  } catch (error) {
    logger.error('Exception normalising Wallet payload', {
      ...getLoggingFields(req),
      charge_status: charge.status,
      error,
      wallet
    })
    return next(error)
  }

  const chargeOptions = {
    chargeId,
    wallet,
    paymentProvider,
    payload
  }

  return connectorClient({ correlationId: req.headers[CORRELATION_HEADER] }).chargeAuthWithWallet(chargeOptions, getLoggingFields(req))
    .then(data => {
      setSessionVariable(req, `ch_${(chargeId)}.webPaymentAuthResponse`, {
        statusCode: data.statusCode,
        ...data.body && data.body.error_identifier && { errorIdentifier: data.body.error_identifier }
      })

      // Always return 200 - the redirect checks if there are any errors
      res.status(200)
      res.send({ url: `/handle-payment-response/${chargeId}` })
    })
    .catch(err => {
      logger.error(`Error while trying to authorise ${wallet} Pay payment`, {
        ...getLoggingFields(req),
        error: err
      })
      res.status(200)
      // Always return 200 - the redirect handles the error
      res.send({ url: `/handle-payment-response/${chargeId}` })
    })
}
