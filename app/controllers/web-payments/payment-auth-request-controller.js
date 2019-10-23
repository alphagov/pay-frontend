'use strict'

// NPM dependencies
const AWSXRay = require('aws-xray-sdk')
const { getNamespace } = require('continuation-local-storage')
const logger = require('../../utils/logger')(__filename)
const connectorClient = require('../../services/clients/connector_client')
const normaliseApplePayPayload = require('./apple-pay/normalise-apple-pay-payload')
const normaliseGooglePayPayload = require('./google-pay/normalise-google-pay-payload')
const { CORRELATION_HEADER } = require('../../../config/correlation_header')
const { setSessionVariable } = require('../../utils/cookies')

// constants
const clsXrayConfig = require('../../../config/xray-cls')

module.exports = (req, res) => {
  const { chargeId, params, body } = req
  const { provider } = params
  const payload = provider === 'apple' ? normaliseApplePayPayload(body) : normaliseGooglePayPayload(body)
  const namespace = getNamespace(clsXrayConfig.nameSpaceName)
  const clsSegment = namespace.get(clsXrayConfig.segmentKeyName)
  return AWSXRay.captureAsyncFunc('Auth_charge_wallet', subsegment => {
    return connectorClient({ correlationId: req.headers[CORRELATION_HEADER] }).chargeAuthWithWallet({ chargeId, provider, payload })
      .then(data => {
        subsegment.close()
        setSessionVariable(req, `ch_${(chargeId)}.webPaymentAuthResponse`, {
          statusCode: data.statusCode
        })
        logger.info(`Successful auth for ${provider} Pay payment. ChargeID: ${chargeId}`)
        res.status(200)
        res.send({ url: `/handle-payment-response/${chargeId}` })
      })
      .catch(err => {
        subsegment.close('error')
        logger.error(`Error while trying to authorise ${provider} Pay payment: ${err}`)
        res.status(200)
        res.send({ url: `/handle-payment-response/${chargeId}` })
      })
  }, clsSegment)
}
