'use strict'

const { WALLET } = require('@govuk-pay/pay-js-commons/lib/logging/keys')

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
const webPaymentsRouteFor = (resource, wallet, chargeId) => paths.generateRoute(`webPayments.${resource}`, { wallet, chargeId })

const redirect = res => {
  return {
    toAuth3dsRequired: (chargeId) => res.redirect(303, routeFor('auth3dsRequired', chargeId)),
    toAuthWaiting: chargeId => res.redirect(303, routeFor('authWaiting', chargeId)),
    toConfirm: chargeId => res.redirect(303, routeFor('confirm', chargeId)),
    toNew: chargeId => res.redirect(303, routeFor('new', chargeId)),
    toReturn: chargeId => res.redirect(303, routeFor('return', chargeId))
  }
}

const handleAuthResponse = (req, res, charge, wallet) => response => {
  const loggingFields = getLoggingFields(req)
  loggingFields[WALLET] = wallet

  logger.info('Handling authorisation response for digital wallet payment', loggingFields)
  switch (response.statusCode) {
    case 202:
    case 409:
      logging.failedChargePost(409, loggingFields)
      redirect(res).toAuthWaiting(req.chargeId)
      break
    case 200:
      if (charge.status === State.AUTH_3DS_REQUIRED) {
        logger.info('Requesting 3DS1 for Google payment, redirect to auth 3ds page', loggingFields)
        return redirect(res).toAuth3dsRequired(req.chargeId)
      } else {
        logger.info('Requesting capture for digital wallet payment', loggingFields)
        Charge(req.headers[CORRELATION_HEADER])
          .capture(req.chargeId, loggingFields)
          .then(
            () => {
              logger.info('Successful capture for digital wallet payment.', loggingFields)
              return redirect(res).toReturn(req.chargeId)
            },
            err => {
              if (err.message === 'CAPTURE_FAILED') {
                return responseRouter.response(req, res, 'CAPTURE_FAILURE', withAnalytics(
                  charge,
                  {},
                  webPaymentsRouteFor('handlePaymentResponse', wallet, charge.id)))
              } else {
                responseRouter.systemErrorResponse(req, res, 'Wallet auth response capture payment attempt error', withAnalytics(
                  charge,
                  { returnUrl: routeFor('return', charge.id) },
                  webPaymentsRouteFor('handlePaymentResponse', wallet, charge.id)
                ), err)
              }
            }
          )
      }
      break
    case 400:
      logging.failedChargePost(response.statusCode, loggingFields)
      if (response.errorIdentifier === 'AUTHORISATION_REJECTED') {
        return responseRouter.response(req, res, 'AUTHORISATION_REJECTED', withAnalytics(
          charge,
          { returnUrl: routeFor('return', charge.id) },
          webPaymentsRouteFor('handlePaymentResponse', wallet, charge.id))
        )
      } else {
        return responseRouter.errorResponse(req, res, 'Payment authorisation error occurred, ' +
          'but not due to transaction being declined.', withAnalytics(
          charge,
          { returnUrl: routeFor('return', charge.id) },
          webPaymentsRouteFor('handlePaymentResponse', wallet, charge.id))
        )
      }
    default:
      logging.failedChargePost(response.statusCode, loggingFields)
      responseRouter.systemErrorResponse(req, res, 'Wallet authorisation error response', withAnalytics(
        charge,
        { returnUrl: routeFor('return', charge.id) },
        webPaymentsRouteFor('handlePaymentResponse', wallet, charge.id))
      )
  }
}

module.exports = (req, res) => {
  const { wallet } = req.params
  const webPaymentAuthResponseSessionKey = `ch_${(req.chargeId)}.webPaymentAuthResponse`
  const charge = normalise.charge(req.chargeData, req.chargeId)
  const connectorResponse = getSessionVariable(req, webPaymentAuthResponseSessionKey)
  if (!connectorResponse) {
    return responseRouter.systemErrorResponse(req, res, 'Web payment auth error, no connector response', withAnalytics(
      charge,
      { returnUrl: routeFor('return', charge.id) },
      webPaymentsRouteFor('handlePaymentResponse', wallet, charge.id)
    ))
  }
  deleteSessionVariable(req, webPaymentAuthResponseSessionKey)
  return handleAuthResponse(req, res, charge, wallet)(connectorResponse)
}
