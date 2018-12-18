'use strict'

// NPM dependencies
const normalise = require('../../services/normalise_charge')
const logging = require('../../utils/logging')
const responseRouter = require('../../utils/response_router')
const {CORRELATION_HEADER} = require('../../../config/correlation_header')
const Charge = require('../../models/charge')
const {withAnalytics} = require('../../utils/analytics')
const paths = require('../../paths')
const {getSessionVariable, deleteSessionVariable} = require('../../utils/cookies')

// constants
const routeFor = (resource, chargeId) => paths.generateRoute(`card.${resource}`, {chargeId: chargeId})
const applePayRouteFor = (resource, chargeId) => paths.generateRoute(`applePay.${resource}`, {chargeId: chargeId})

const redirect = res => {
  return {
    toAuthWaiting: (chargeId) => res.redirect(303, routeFor('authWaiting', chargeId)),
    toConfirm: (chargeId) => res.redirect(303, routeFor('confirm', chargeId)),
    toNew: (chargeId) => res.redirect(303, routeFor('new', chargeId)),
    toReturn: (chargeId) => res.redirect(303, routeFor('return', chargeId))
  }
}

const handleAuthResponse = (req, res, charge) => response => {
  switch (response.statusCode) {
    case 202:
    case 409:
      logging.failedChargePost(409)
      redirect(res).toAuthWaiting(req.chargeId)
      break
    case 200:
      Charge(req.headers[CORRELATION_HEADER])
        .capture(req.chargeId)
        .then(
          () => redirect(res).toReturn(req.chargeId),
          err => {
            if (err.message === 'CAPTURE_FAILED') {
              return responseRouter.response(req, res, 'CAPTURE_FAILURE', withAnalytics(
                charge,
                {},
                applePayRouteFor('handlePaymentResponse', charge.id)))
            } else {
              responseRouter.response(req, res, 'SYSTEM_ERROR', withAnalytics(
                charge,
                {returnUrl: routeFor('return', charge.id)},
                applePayRouteFor('handlePaymentResponse', charge.id)
              ))
            }
          }
        )
      break
    case 400:
    case 500:
      logging.failedChargePost(409)
      responseRouter.response(req, res, 'SYSTEM_ERROR', withAnalytics(
        charge,
        {returnUrl: routeFor('return', charge.id)},
        applePayRouteFor('handlePaymentResponse', charge.id))
      )
      break
    default:
      redirect(res).toNew(req.chargeId)
  }
}

module.exports = (req, res) => {
  const applePayAuthResponseSessionKey = `ch_${(req.chargeId)}.applePayAuthResponse`
  const charge = normalise.charge(req.chargeData, req.chargeId)
  const connectorResponse = getSessionVariable(req, applePayAuthResponseSessionKey)
  if (!connectorResponse) {
    return responseRouter.response(req, res, 'SYSTEM_ERROR', withAnalytics(
      charge,
      {returnUrl: routeFor('return', charge.id)},
      applePayRouteFor('handlePaymentResponse', charge.id)
    ))
  }
  deleteSessionVariable(req, applePayAuthResponseSessionKey)
  return handleAuthResponse(req, res, charge)(connectorResponse)
}
