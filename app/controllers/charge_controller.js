'use strict'
const logger = require('winston')
const logging = require('../utils/logging.js')
const baseClient = require('../utils/base_client')

const _ = require('lodash')
const views = require('../utils/views.js')
const normalise = require('../services/normalise_charge.js')
const chargeValidator = require('../utils/charge_validation_backend.js')
const i18n = require('i18n')
const Charge = require('../models/charge.js')
const Card = require('../models/card.js')
const State = require('../models/state.js')
const paths = require('../paths.js')
const CHARGE_VIEW = 'charge'
const CONFIRM_VIEW = 'confirm'
const AUTH_WAITING_VIEW = 'auth_waiting'
const AUTH_3DS_REQUIRED_VIEW = 'auth_3ds_required'
const AUTH_3DS_REQUIRED_OUT_VIEW = 'auth_3ds_required_out'
const AUTH_3DS_REQUIRED_IN_VIEW = 'auth_3ds_required_in'
const CAPTURE_WAITING_VIEW = 'capture_waiting'
const preserveProperties = ['cardholderName', 'addressLine1', 'addressLine2', 'addressCity', 'addressPostcode', 'addressCountry']
const countries = require('../services/countries.js')
const CORRELATION_HEADER = require('../utils/correlation_header.js').CORRELATION_HEADER
const {withAnalyticsError, withAnalytics} = require('../utils/analytics.js')

function appendChargeForNewView(charge, req, chargeId) {
  const cardModel = Card(charge.gatewayAccount.cardTypes, req.headers[CORRELATION_HEADER])
  const translation = i18n.__('chargeController.withdrawalText')
  charge.withdrawalText = translation[cardModel.withdrawalTypes.join('_')]
  charge.allowedCards = cardModel.allowed
  charge.cardsAsStrings = JSON.stringify(cardModel.allowed)
  charge.post_card_action = routeFor('create', chargeId)
  charge.id = chargeId
  charge.post_cancel_action = routeFor('cancel', chargeId)
}

function routeFor(resource, chargeId) {
  return paths.generateRoute(`card.${resource}`, {chargeId: chargeId})
}

function redirect(res) {
  return {
    toAuth3dsRequired: (chargeId) => res.redirect(303, routeFor('auth3dsRequired', chargeId)),
    toAuthWaiting: (chargeId) => res.redirect(303, routeFor('authWaiting', chargeId)),
    toConfirm: (chargeId) => res.redirect(303, routeFor('confirm', chargeId)),
    toNew: (chargeId) => res.redirect(303, routeFor('new', chargeId)),
    toReturn: (chargeId) => res.redirect(303, routeFor('return', chargeId))
  }
}

module.exports = {
  new: (req, res) => {
    const _views = views.create()
    const charge = normalise.charge(req.chargeData, req.chargeId)
    appendChargeForNewView(charge, req, charge.id)
    charge.countries = countries.retrieveCountries()
    if (charge.status === State.ENTERING_CARD_DETAILS) return _views.display(res, CHARGE_VIEW, withAnalytics(charge, charge))
    Charge(req.headers[CORRELATION_HEADER]).updateToEnterDetails(charge.id).then(
      () => _views.display(res, CHARGE_VIEW, withAnalytics(charge, charge)),
      () => _views.display(res, 'NOT_FOUND', withAnalyticsError()))
  },

  create: function (req, res) {
    var charge = normalise.charge(req.chargeData, req.chargeId)
    var _views = views.create()

    var cardModel = Card(req.chargeData.gateway_account.card_types, req.headers[CORRELATION_HEADER])
    var submitted = charge.status === State.AUTH_READY
    var authUrl = normalise.authUrl(charge)

    var validator = chargeValidator(
      i18n.__('chargeController.fieldErrors'),
      logger,
      cardModel
    )

    normalise.addressLines(req.body)
    normalise.whitespace(req.body)

    if (submitted) {
      return redirect(res).toAuthWaiting(req.chargeId)
    }

    var awaitingAuth = function () {
      logging.failedChargePost(409, authUrl)
      redirect(res).toAuthWaiting(req.chargeId)
    }

    var successfulAuth = function () {
      redirect(res).toConfirm(req.chargeId)
    }

    var authResolver = function (status) {
      switch (status) {
        case (State.AUTH_3DS_REQUIRED):
          redirect(res).toAuth3dsRequired(req.chargeId)
          break
        default:
          successfulAuth()
      }
    }

    var connectorFailure = function () {
      logging.failedChargePost(409, authUrl)
      _views.display(res, 'SYSTEM_ERROR', withAnalytics(
        charge,
        {returnUrl: routeFor('return', charge.id)}))
    }

    var unknownFailure = function () {
      redirect(res).toNew(req.chargeId)
    }

    var connectorNonResponsive = function (err) {
      logging.failedChargePostException(err)
      _views.display(res, 'ERROR', withAnalytics(charge))
    }

    var hasValidationError = function (validation) {
      charge.countries = countries.retrieveCountries()
      appendChargeForNewView(charge, req, charge.id)
      _.merge(validation, withAnalytics(charge, charge), _.pick(req.body, preserveProperties))

      return _views.display(res, CHARGE_VIEW, validation)
    }

    var responses = {
      202: awaitingAuth,
      409: awaitingAuth,
      200: authResolver,
      500: connectorFailure
    }

    function postAuth (authUrl, req, cardBrand) {
      var startTime = new Date()
      var correlationId = req.headers[CORRELATION_HEADER] || ''

      baseClient.post(authUrl, { data: normalise.apiPayload(req, cardBrand), correlationId: correlationId },
        function (data, json) {
          logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'POST', authUrl, new Date() - startTime)
          var response = responses[json.statusCode]
          if (!response) return unknownFailure()
          response(_.get(data, 'status'))
        }).on('error', connectorNonResponsive)
    }
    validator.verify(req).then(function (data) {
      if (data.validation.hasError) return hasValidationError(data.validation)

      var cardBrand = data.cardBrand

      logging.authChargePost(authUrl)
      var chargeModel = Charge(req.headers[CORRELATION_HEADER])
      chargeModel.patch(req.chargeId, 'replace', 'email', req.body.email)
        .then(function () {
            postAuth(authUrl, req, cardBrand)
          }, function (err) {
            logging.failedChargePatch(err)
            _views.display(res, 'ERROR', withAnalyticsError())
          }
        )
    }, unknownFailure)
  },

  checkCard: function (req, res) {
    var cardModel = Card(req.chargeData.gateway_account.card_types, req.headers[CORRELATION_HEADER])
    cardModel.checkCard(normalise.creditCard(req.body.cardNo))
      .then(
        () => { res.json({'accepted': true}) },
        (data) => { res.json({'accepted': false, 'message': data}) }
      )
  },

  authWaiting: function (req, res) {
    var charge = normalise.charge(req.chargeData, req.chargeId)
    switch (charge.status) {
      case (State.AUTH_READY):
      case (State.AUTH_3DS_READY):
        var _views = views.create({})
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
    var charge = normalise.charge(req.chargeData, req.chargeId)
    var startTime = new Date()
    var correlationId = req.headers[CORRELATION_HEADER] || ''
    var _views = views.create()
    var templateData = {
      pa_response: _.get(req, 'body.PaRes')
    }
    var connector3dsUrl = paths.generateRoute('connectorCharge.threeDs', {chargeId: charge.id})

    baseClient.post(connector3dsUrl, { data: templateData, correlationId: correlationId },
      function (data, json) {
        logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'POST', connector3dsUrl, new Date() - startTime)
        switch (json.statusCode) {
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
      }).on('error', function () {
      _views.display(res, 'ERROR', withAnalytics(charge))
    })
  },
  auth3dsRequired: function (req, res) {
    var charge = normalise.charge(req.chargeData, req.chargeId)
    var _views = views.create()
    _views.display(res, AUTH_3DS_REQUIRED_VIEW, withAnalytics(charge))
  },

  auth3dsRequiredOut: function (req, res) {
    var charge = normalise.charge(req.chargeData, req.chargeId)
    var templateData = {
      issuerUrl: _.get(charge, 'auth3dsData.issuerUrl'),
      paRequest: _.get(charge, 'auth3dsData.paRequest'),
      termUrl: paths.generateRoute('external.card.auth3dsRequiredIn', {chargeId: charge.id})
    }
    var _views = views.create()
    _views.display(res, AUTH_3DS_REQUIRED_OUT_VIEW, templateData)
  },

  auth3dsRequiredIn: function (req, res) {
    var charge = normalise.charge(req.chargeData, req.chargeId)
    var templateData = {
      threeDsHandlerUrl: routeFor('auth3dsHandler', charge.id),
      paResponse: _.get(req, 'body.PaRes')
    }
    var _views = views.create()
    _views.display(res, AUTH_3DS_REQUIRED_IN_VIEW, templateData)
  },
  confirm: function (req, res) {
    var charge = normalise.charge(req.chargeData, req.chargeId)
    var confirmPath = routeFor('confirm', charge.id)
    var _views = views.create()
    var init = function () {
      _views.display(res, CONFIRM_VIEW, withAnalytics(charge, {
          hitPage: routeFor('new', charge.id) + '/success',
          charge: charge,
          confirmPath: confirmPath,
          gatewayAccount: {serviceName: charge.gatewayAccount.serviceName},
          post_cancel_action: routeFor('cancel', charge.id)
        },
        confirmPath))
    }
    init()
  },

  capture: function (req, res) {
    var charge = normalise.charge(req.chargeData, req.chargeId)
    var _views = views.create()

    var init = function () {
      var chargeModel = Charge(req.headers[CORRELATION_HEADER])
      chargeModel.capture(req.chargeId).then(function () {
        redirect(res).toReturn(req.chargeId)
      }, captureFail)
    }

    var captureFail = function (err) {
      if (err.message === 'CAPTURE_FAILED') return _views.display(res, 'CAPTURE_FAILURE', withAnalytics(charge))
      _views.display(res, 'SYSTEM_ERROR', withAnalytics(
        charge,
        {returnUrl: routeFor('return', charge.id)}
      ))
    }
    init()
  },

  captureWaiting: function (req, res) {
    var charge = normalise.charge(req.chargeData, req.chargeId)
    var _views = views.create()

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
    var charge = normalise.charge(req.chargeData, req.chargeId)

    var _views = views.create()
    var cancelFail = function () {
      _views.display(res, 'SYSTEM_ERROR', withAnalytics(
        charge,
        {returnUrl: routeFor('return', charge.id)}
      ))
    }

    var chargeModel = Charge(req.headers[CORRELATION_HEADER])
    chargeModel.cancel(req.chargeId)
      .then(function () {
        return _views.display(res, 'USER_CANCELLED', withAnalytics(
          charge,
          {returnUrl: routeFor('return', charge.id)}
        ))
      }, cancelFail)
  }
}
