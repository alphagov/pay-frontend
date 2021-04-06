'use strict'

// NPM dependencies
const normalise = require('../../services/normalise-charge')
const logging = require('../../utils/logging')
const logger = require('../../utils/logger')(__filename)
const { getLoggingFields } = require('../../utils/logging-fields-helper')
const responseRouter = require('../../utils/response-router')
const { CORRELATION_HEADER } = require('../../../config/correlation-header')
const Charge = require('../../models/charge')
const { withAnalytics } = require('../../utils/analytics')
const paths = require('../../paths')
const { getSessionVariable, deleteSessionVariable } = require('../../utils/cookies')
const State = require('../../../config/state')

// constants
const routeFor = (resource, chargeId) => paths.generateRoute(`card.${resource}`, { chargeId })
const webPaymentsRouteFor = (resource, chargeId) => paths.generateRoute(`webPayments.${resource}`, { chargeId })

const redirect = res => {
  return {
    toAuth3dsRequired: (chargeId) => res.redirect(303, routeFor('auth3dsRequired', chargeId)),
    toAuthWaiting: chargeId => res.redirect(303, routeFor('authWaiting', chargeId)),
    toConfirm: chargeId => res.redirect(303, routeFor('confirm', chargeId)),
    toNew: chargeId => res.redirect(303, routeFor('new', chargeId)),
    toReturn: chargeId => res.redirect(303, routeFor('return', chargeId))
  }
}

const handleAuthResponse = (req, res, charge) => response => {
  switch (response.statusCode) {
    case 202:
    case 409:
      logging.failedChargePost(409, getLoggingFields(req))
      redirect(res).toAuthWaiting(req.chargeId)
      break
    case 200:
      if (charge.status === State.AUTH_3DS_REQUIRED) {
        logger.info('Requesting 3DS1 for Google payment, redirect to auth 3ds page', getLoggingFields(req))
        return redirect(res).toAuth3dsRequired(req.chargeId)
      } else {
        Charge(req.headers[CORRELATION_HEADER])
          .capture(req.chargeId, getLoggingFields(req))
          .then(
            () => {
              logger.info('Successful capture for digital wallet payment.', getLoggingFields(req))
              return redirect(res).toReturn(req.chargeId)
            },
            err => {
              if (err.message === 'CAPTURE_FAILED') {
                return responseRouter.response(req, res, 'CAPTURE_FAILURE', withAnalytics(
                  charge,
                  {},
                  webPaymentsRouteFor('handlePaymentResponse', charge.id)))
              } else {
                responseRouter.systemErrorResponse(req, res, 'Wallet auth response capture payment attempt error', withAnalytics(
                  charge,
                  { returnUrl: routeFor('return', charge.id) },
                  webPaymentsRouteFor('handlePaymentResponse', charge.id)
                ), err)
              }
            }
          )
      }
      break
    case 400:
    case 500:
      logging.failedChargePost(500, getLoggingFields(req))
      responseRouter.systemErrorResponse(req, res, 'Wallet authorisation error response', withAnalytics(
        charge,
        { returnUrl: routeFor('return', charge.id) },
        webPaymentsRouteFor('handlePaymentResponse', charge.id))
      )
      break
    default:
      redirect(res).toNew(req.chargeId)
  }
}

module.exports = (req, res) => {
  const webPaymentAuthResponseSessionKey = `ch_${(req.chargeId)}.webPaymentAuthResponse`
  const charge = normalise.charge(req.chargeData, req.chargeId)
  const connectorResponse = getSessionVariable(req, webPaymentAuthResponseSessionKey)
  if (!connectorResponse) {
    return responseRouter.systemErrorResponse(req, res, 'Web payment auth error, no connector response', withAnalytics(
      charge,
      { returnUrl: routeFor('return', charge.id) },
      webPaymentsRouteFor('handlePaymentResponse', charge.id)
    ))
  }
  deleteSessionVariable(req, webPaymentAuthResponseSessionKey)
  return handleAuthResponse(req, res, charge)(connectorResponse)
}
