'use strict'

// NPM dependencies
const AWSXRay = require('aws-xray-sdk')
const { getNamespace } = require('continuation-local-storage')
const logger = require('winston')
const connectorClient = require('../../services/clients/connector_client')
const normaliseApplePayPayload = require('./normalise-apple-pay-payload')
const { CORRELATION_HEADER } = require('../../../config/correlation_header')
const { setSessionVariable } = require('../../utils/cookies')

// constants
const clsXrayConfig = require('../../../config/xray-cls')

module.exports = (req, res) => {
  const payload = normaliseApplePayPayload(req.body)
  const namespace = getNamespace(clsXrayConfig.nameSpaceName)
  const clsSegment = namespace.get(clsXrayConfig.segmentKeyName)
  return AWSXRay.captureAsyncFunc('Auth_charge_wallet', subsegment => {
    return connectorClient({ correlationId: req.headers[CORRELATION_HEADER] }).chargeAuthWithWallet({ chargeId: req.chargeId, payload: payload })
      .then(data => {
        subsegment.close()
        setSessionVariable(req, `ch_${(req.chargeId)}.applePayAuthResponse`, {
          statusCode: data.statusCode
        })
        res.status(200)
        res.send({ url: `/handle-payment-response/${req.chargeId}` })
      })
      .catch(err => {
        subsegment.close('error')
        logger.error('error while trying to authorise apple pay payment: ' + err)
        res.status(200)
        res.send({ url: `/handle-payment-response/${req.chargeId}` })
      })
  }, clsSegment)
}
