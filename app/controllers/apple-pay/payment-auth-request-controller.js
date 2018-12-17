'use strict'

// NPM dependencies
const AWSXRay = require('aws-xray-sdk')
const {getNamespace} = require('continuation-local-storage')
const logger = require('winston')
const connectorClient = require('../../services/clients/connector_client')
const normaliseApplePayPayload = require('./normalise-apple-pay-payload')
const CORRELATION_HEADER = require('../../../config/correlation_header').CORRELATION_HEADER
const {setSessionVariable} = require('../../utils/cookies')
const {createChargeIdSessionKey} = require('../../utils/session')

// constants
const clsXrayConfig = require('../../../config/xray-cls')

const applePayAuthResponseSessionKey = chargeId => `${createChargeIdSessionKey(chargeId)}.applePayAuthResponse`

module.exports = (req, res) => {
  const payload = normaliseApplePayPayload(req.body)
  const namespace = getNamespace(clsXrayConfig.nameSpaceName)
  const clsSegment = namespace.get(clsXrayConfig.segmentKeyName)
  return AWSXRay.captureAsyncFunc('Auth_charge_wallet', subsegment => {
    return connectorClient({correlationId: req.headers[CORRELATION_HEADER]}).chargeAuthWithWallet({chargeId: req.chargeId, payload: payload})
      .then(data => {
        subsegment.close()
        setSessionVariable(req, applePayAuthResponseSessionKey(req.chargeId), data)
      })
      .catch(err => {
        subsegment.close('error')
        logger.error('error while trying to authorise apple pay payment: ' + err)
      })
      .finally(() => res.status(200).send({url: `/handle-payment-response/${req.chargeId}`}))
  }, clsSegment)
}

exports.applePayAuthResponseSessionKey = applePayAuthResponseSessionKey
