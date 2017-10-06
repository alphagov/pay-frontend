'use strict'

// Third party modules
const logger = require('pino')()
const _ = require('lodash')
const i18n = require('i18n')

// Custom modules
const logging = require('../utils/logging.js')
const baseClient = require('../utils/base_client')
const _views = require('../utils/views.js').create()
const normalise = require('../services/normalise_charge.js')
const chargeValidator = require('../utils/charge_validation_backend.js')
const chargeModel = require('../models/charge.js')
const Card = require('../models/card.js')
const State = require('../models/state.js')
const paths = require('../paths.js')
const {withAnalyticsError, withAnalytics} = require('../utils/analytics.js')

// Strings and constants
const CHARGE_VIEW = 'charge'
const CONFIRM_VIEW = 'confirm'
const AUTH_WAITING_VIEW = 'auth_waiting'
const AUTH_3DS_REQUIRED_VIEW = 'auth_3ds_required'
const AUTH_3DS_REQUIRED_OUT_VIEW = 'auth_3ds_required_out'
const AUTH_3DS_REQUIRED_IN_VIEW = 'auth_3ds_required_in'
const CAPTURE_WAITING_VIEW = 'capture_waiting'
const preserveProperties = ['cardholderName', 'addressLine1', 'addressLine2', 'addressCity', 'addressPostcode', 'addressCountry']
const countries = require('../services/countries.js').retrieveCountries()
const CORRELATION_HEADER = require('../utils/correlation_header.js').CORRELATION_HEADER

module.exports = {
  new: function (req, res) {
    let charge = normalise.charge(req.chargeData, req.chargeId)
    appendChargeForNewView(charge, req, charge.id)
    charge.countries = countries
    if (charge.status === State.ENTERING_CARD_DETAILS) {
      return _views.display(res, CHARGE_VIEW, withAnalytics(charge, charge))
    }
    chargeModel.updateToEnterDetails(charge.id, req.headers[CORRELATION_HEADER])
        .then(() => {
          _views.display(res, CHARGE_VIEW, withAnalytics(charge, charge))
        }, () => { _views.display(res, 'NOT_FOUND', withAnalyticsError()) })
  },

  create: function (req, res) {
    let charge = normalise.charge(req.chargeData, req.chargeId)
    const cardModel = Card(req.chargeData.gateway_account.card_types, req.headers[CORRELATION_HEADER])
    const submitted = charge.status === State.AUTH_READY
    const authUrl = normalise.authUrl(charge)
    const validator = chargeValidator(
        i18n.__('chargeController.fieldErrors'),
        logger,
        cardModel
    )
    normalise.addressLines(req.body)
    normalise.whitespace(req.body)
    if (submitted) {
      return redirect(res).toAuthWaiting(req.chargeId)
    }
    validator.verify(req).then(data => {
      if (data.validation.hasError) return hasValidationError(req, res, data.validation, charge)
      const cardBrand = data.cardBrand
      logging.authChargePost(authUrl)
      chargeModel.patch(req.chargeId, 'replace', 'email', req.body.email, req.headers[CORRELATION_HEADER])
          .then(() => {
            const startTime = new Date()
            const correlationId = req.headers[CORRELATION_HEADER] || ''
            baseClient.post(authUrl, { data: normalise.apiPayload(req, cardBrand), correlationId: correlationId },
                (data, status) => {
                  logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'POST', authUrl, new Date() - startTime)
                  const response = responses[status.statusCode]
                  if (!response) return redirect(res).toNew(req.chargeId)
                  response(req, res, _.get(data, 'status'), authUrl, charge)
                })
          }, err => {
            logging.failedChargePatch(err)
            _views.display(res, 'ERROR', withAnalyticsError())
          })
    }, () => { redirect(res).toNew(req.chargeId) })
  },

  checkCard: function (req, res) {
    const cardModel = Card(req.chargeData.gateway_account.card_types, req.headers[CORRELATION_HEADER])
    cardModel.checkCard(normalise.creditCard(req.body.cardNo))
        .then(
            () => { res.json({'accepted': true}) },
            err => { res.json({'accepted': false, 'message': err}) }
        )
  },

  authWaiting: function (req, res) {
    const charge = normalise.charge(req.chargeData, req.chargeId)
    switch (charge.status) {
      case (State.AUTH_READY):
      case (State.AUTH_3DS_READY):
        _views.display(res, AUTH_WAITING_VIEW, withAnalytics(charge))
        break
      case (State.AUTH_3DS_REQUIRED):
        redirect(res).toAuth3dsRequired(req.chargeId)
        break
      default:
        redirect(res).toConfirm(req.chargeId)
    }
  },
  auth3dsHandler (req, res) {
    const charge = normalise.charge(req.chargeData, req.chargeId)
    const startTime = new Date()
    const correlationId = req.headers[CORRELATION_HEADER] || ''
    const templateData = {
      pa_response: _.get(req, 'body.PaRes')
    }
    const connector3dsUrl = paths.generateRoute('connectorCharge.threeDs', {chargeId: charge.id})

    baseClient.post(connector3dsUrl, { data: templateData, correlationId: correlationId },
        function (data, status) {
          logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'POST', connector3dsUrl, new Date() - startTime)
          switch (status.statusCode) {
            case 200:
            case 400:
              redirect(res).toConfirm(charge.id)
              break
            case 202:
            case 409:
              redirect(res).toAuthWaiting(charge.id)
              break
            case 500:
              _views.display(res, 'SYSTEM_ERROR', withAnalytics(charge))
              break
            default:
              _views.display(res, 'ERROR', withAnalytics(charge))
          }
        })
  },
  auth3dsRequired: function (req, res) {
    const charge = normalise.charge(req.chargeData, req.chargeId)
    _views.display(res, AUTH_3DS_REQUIRED_VIEW, withAnalytics(charge))
  },

  auth3dsRequiredOut: function (req, res) {
    const charge = normalise.charge(req.chargeData, req.chargeId)
    const templateData = {
      issuerUrl: _.get(charge, 'auth3dsData.issuerUrl'),
      paRequest: _.get(charge, 'auth3dsData.paRequest'),
      termUrl: paths.generateRoute('external.card.auth3dsRequiredIn', {chargeId: charge.id})
    }
    _views.display(res, AUTH_3DS_REQUIRED_OUT_VIEW, templateData)
  },

  auth3dsRequiredIn: function (req, res) {
    const charge = normalise.charge(req.chargeData, req.chargeId)
    const templateData = {
      threeDsHandlerUrl: routeFor('auth3dsHandler', charge.id),
      paResponse: _.get(req, 'body.PaRes')
    }

    _views.display(res, AUTH_3DS_REQUIRED_IN_VIEW, templateData)
  },

  confirm: function (req, res) {
    const charge = normalise.charge(req.chargeData, req.chargeId)
    const confirmPath = routeFor('confirm', charge.id)

    _views.display(res, CONFIRM_VIEW, withAnalytics(charge, {
      hitPage: routeFor('new', charge.id) + '/success',
      charge: charge,
      confirmPath: confirmPath,
      gatewayAccount: {serviceName: charge.gatewayAccount.serviceName},
      post_cancel_action: routeFor('cancel', charge.id)
    },
        confirmPath))
  },

  capture: function (req, res) {
    const charge = normalise.charge(req.chargeData, req.chargeId)

    chargeModel.capture(req.chargeId, req.headers[CORRELATION_HEADER]).then(() => {
      redirect(res).toReturn(req.chargeId)
    }, err => {
      if (err.message === 'CAPTURE_FAILED') return _views.display(res, 'CAPTURE_FAILURE', withAnalytics(charge))
      _views.display(res, 'SYSTEM_ERROR', withAnalytics(charge, {returnUrl: routeFor('return', charge.id)}))
    })
  },

  captureWaiting: function (req, res) {
    const charge = normalise.charge(req.chargeData, req.chargeId)

    if (charge.status === State.CAPTURE_READY) {
      _views.display(res, CAPTURE_WAITING_VIEW, withAnalytics(charge))
    } else {
      _views.display(res, 'CAPTURE_SUBMITTED', withAnalytics(
          charge,
          {returnUrl: routeFor('return', charge.id)}
      ))
    }
  },

  cancel: function (req, res) {
    const charge = normalise.charge(req.chargeData, req.chargeId)

    chargeModel.cancel(req.chargeId, req.headers[CORRELATION_HEADER])
        .then(() => {
          return _views.display(res, 'USER_CANCELLED', withAnalytics(
              charge,
              {returnUrl: routeFor('return', charge.id)}
          ))
        }, () => {
          _views.display(res, 'SYSTEM_ERROR', withAnalytics(
              charge,
              {returnUrl: routeFor('return', charge.id)}
          ))
        })
  }
}

const awaitingAuth = (req, res, status, authUrl) => {
  logging.failedChargePost(409, authUrl)
  redirect(res).toAuthWaiting(req.chargeId)
}

const authResolver = (req, res, status) => {
  switch (status) {
    case (State.AUTH_3DS_REQUIRED):
      redirect(res).toAuth3dsRequired(req.chargeId)
      break
    default:
      redirect(res).toConfirm(req.chargeId)
  }
}

const connectorFailure = (req, res, status, authUrl, charge) => {
  logging.failedChargePost(409, authUrl)
  _views.display(res, 'SYSTEM_ERROR', withAnalytics(
      charge,
      {returnUrl: routeFor('return', charge.id)}))
}

// const unknownFailure = (req, res) => {
//   redirect(res).toNew(req.chargeId)
// }

const hasValidationError = (req, res, validation, charge) => {
  charge.countries = countries
  appendChargeForNewView(charge, req, res, charge.id)
  _.merge(validation, withAnalytics(charge, charge), _.pick(req.body, preserveProperties))

  return _views.display(res, CHARGE_VIEW, validation)
}

const responses = {
  202: awaitingAuth,
  409: awaitingAuth,
  200: authResolver,
  500: connectorFailure
}

const appendChargeForNewView = (charge, req, chargeId) => {
  const cardModel = Card(charge.gatewayAccount.cardTypes, req.headers[CORRELATION_HEADER])
  const translation = i18n.__('chargeController.withdrawalText')
  charge.withdrawalText = translation[cardModel.withdrawalTypes.join('_')]
  charge.allowedCards = cardModel.allowed
  charge.cardsAsStrings = JSON.stringify(cardModel.allowed)
  charge.post_card_action = routeFor('create', chargeId)
  charge.id = chargeId
  charge.post_cancel_action = routeFor('cancel', chargeId)
}

const routeFor = (resource, chargeId) => {
  return paths.generateRoute(`card.${resource}`, {chargeId: chargeId})
}

const redirect = (res) => {
  return {
    toAuth3dsRequired: (chargeId) => res.redirect(303, routeFor('auth3dsRequired', chargeId)),
    toAuthWaiting: (chargeId) => res.redirect(303, routeFor('authWaiting', chargeId)),
    toConfirm: (chargeId) => res.redirect(303, routeFor('confirm', chargeId)),
    toNew: (chargeId) => res.redirect(303, routeFor('new', chargeId)),
    toReturn: (chargeId) => res.redirect(303, routeFor('return', chargeId))
  }
}
