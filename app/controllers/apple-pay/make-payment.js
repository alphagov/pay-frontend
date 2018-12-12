'use strict'

// NPM dependencies
const logger = require('winston')
const AWSXRay = require('aws-xray-sdk')
const {getNamespace} = require('continuation-local-storage')

const normalise = require('../../services/normalise_charge')
const logging = require('../../utils/logging')
const connectorClient = require('../../services/clients/connector_client')
const normaliseApplePayPayload = require('./normalise-apple-pay-payload')
const responseRouter = require('../../utils/response_router')
const CORRELATION_HEADER = require('../../../config/correlation_header').CORRELATION_HEADER
const Charge = require('../../models/charge')
const {withAnalyticsError, withAnalytics} = require('../../utils/analytics')
const paths = require('../../paths')

// constants
const clsXrayConfig = require('../../../config/xray-cls')
const routeFor = (resource, chargeId) => paths.generateRoute(`card.${resource}`, {chargeId: chargeId})

const handleAuthResponse = (req, res, charge) => response => {
  switch (response.statusCode) {
    case 202:
    case 409:
      logging.failedChargePost(409)
      return routeFor('authWaiting', req.chargeId)
    case 200:
      console.log('response status >>>> ', response.body.status)
      if (response.body.status !== 'AUTHORISATION SUCCESS') {
        res.status(200).send({
          url: routeFor('confirm', req.chargeId)
        })
      } else {
        console.log('capturing charge ')
        Charge(req.headers[CORRELATION_HEADER])
          .capture(req.chargeId)
          .then(
            () => {
              console.log('bla')
              res.status(200).send({
                url: routeFor('return', req.chargeId)
              })
            },
            err => {
              if (err.message === 'CAPTURE_FAILED') return responseRouter.response(req, res, 'CAPTURE_FAILURE', withAnalytics(charge))
              responseRouter.response(req, res, 'SYSTEM_ERROR', withAnalytics(
                charge,
                {returnUrl: routeFor('return', charge.id)}
              ))
            }
          )
      }
      break
    case 500:
      logging.failedChargePost(409)
      responseRouter.response(req, res, 'SYSTEM_ERROR', withAnalytics(charge, {returnUrl: routeFor('return', charge.id)}))
      break
    default:
      return routeFor('new', req.chargeId)
  }
}

module.exports = (req, res) => {
  console.log('body', req.body)
  const payload = normaliseApplePayPayload(req.body)
  console.log('payload', payload)
  const namespace = getNamespace(clsXrayConfig.nameSpaceName)
  const clsSegment = namespace.get(clsXrayConfig.segmentKeyName)
  const charge = normalise.charge(req.chargeData, req.chargeId)
  return AWSXRay.captureAsyncFunc('Auth_charge_wallet', (subsegment) => {
    return connectorClient({correlationId: req.headers[CORRELATION_HEADER]}).chargeAuthWithWallet({chargeId: req.chargeId, payload: payload})
      .then(data => {
        subsegment.close()
        return handleAuthResponse(req, res, charge)(data)
      })
      .catch(() => {
        subsegment.close('error')
        return responseRouter.response(req, res, 'SYSTEM_ERROR', withAnalyticsError())
      })
  }, clsSegment)
}
