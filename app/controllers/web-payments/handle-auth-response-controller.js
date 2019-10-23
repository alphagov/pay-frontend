'use strict'

// NPM dependencies
const normalise = require('../../services/normalise_charge')
const logging = require('../../utils/logging')
const logger = require('../../utils/logger')(__filename)
const responseRouter = require('../../utils/response_router')
const { CORRELATION_HEADER } = require('../../../config/correlation_header')
const Charge = require('../../models/charge')
const { withAnalytics } = require('../../utils/analytics')
const paths = require('../../paths')
const { getSessionVariable, deleteSessionVariable } = require('../../utils/cookies')

// constants
const routeFor = (resource, chargeId) => paths.generateRoute(`card.${resource}`, { chargeId })
const webPaymentsRouteFor = (resource, chargeId) => paths.generateRoute(`webPayments.${resource}`, { chargeId })

const redirect = res => {
  return {
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
      logging.failedChargePost(409)
      redirect(res).toAuthWaiting(req.chargeId)
      break
    case 200:
      Charge(req.headers[CORRELATION_HEADER])
        .capture(req.chargeId)
        .then(
          () => {
            logger.info(`Successful capture for digital wallet payment. ChargeID: ${charge.id}`)
            return redirect(res).toReturn(req.chargeId)
          },
          err => {
            if (err.message === 'CAPTURE_FAILED') {
              return responseRouter.response(req, res, 'CAPTURE_FAILURE', withAnalytics(
                charge,
                {},
                webPaymentsRouteFor('handlePaymentResponse', charge.id)))
            } else {
              logging.systemError('Wallet auth response capture payment attempt', req.headers && req.headers[CORRELATION_HEADER], charge.id)
              responseRouter.response(req, res, 'SYSTEM_ERROR', withAnalytics(
                charge,
                { returnUrl: routeFor('return', charge.id) },
                webPaymentsRouteFor('handlePaymentResponse', charge.id)
              ))
            }
          }
        )
      break
    case 400:
    case 500:
      logging.failedChargePost(409)
      logging.systemError('Wallet authorisation response', req.headers && req.headers[CORRELATION_HEADER], charge.id)
      responseRouter.response(req, res, 'SYSTEM_ERROR', withAnalytics(
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
    logging.systemError('Web payment auth, no connector response', req.headers && req.headers[CORRELATION_HEADER], charge.id)
    return responseRouter.response(req, res, 'SYSTEM_ERROR', withAnalytics(
      charge,
      { returnUrl: routeFor('return', charge.id) },
      webPaymentsRouteFor('handlePaymentResponse', charge.id)
    ))
  }
  deleteSessionVariable(req, webPaymentAuthResponseSessionKey)
  return handleAuthResponse(req, res, charge)(connectorResponse)
}
