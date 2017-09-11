'use strict'
require('array.prototype.find')
var logger = require('winston')
var logging = require('../utils/logging.js')
var baseClient = require('../utils/base_client2')

var _ = require('lodash')
var views = require('../utils/views.js')
var normalise = require('../services/normalise_charge.js')
var chargeValidator = require('../utils/charge_validation_backend.js')
var i18n = require('i18n')
var Charge = require('../models/charge.js')
var Card = require('../models/card.js')
var State = require('../models/state.js')
var paths = require('../paths.js')
var CHARGE_VIEW = 'charge'
var CONFIRM_VIEW = 'confirm'
var AUTH_WAITING_VIEW = 'auth_waiting'
var AUTH_3DS_REQUIRED_VIEW = 'auth_3ds_required'
var AUTH_3DS_REQUIRED_OUT_VIEW = 'auth_3ds_required_out'
var AUTH_3DS_REQUIRED_IN_VIEW = 'auth_3ds_required_in'
var CAPTURE_WAITING_VIEW = 'capture_waiting'
var preserveProperties = ['cardholderName', 'addressLine1', 'addressLine2', 'addressCity', 'addressPostcode', 'addressCountry']
var countries = require('../services/countries.js')
var CORRELATION_HEADER = require('../utils/correlation_header.js').CORRELATION_HEADER
var {withAnalyticsError, withAnalytics} = require('../utils/analytics.js')

var appendChargeForNewView = function (charge, req, chargeId) {
  var cardModel = Card(charge.gatewayAccount.cardTypes, req.headers[CORRELATION_HEADER])
  var translation = i18n.__('chargeController.withdrawalText')
  charge.withdrawalText = translation[cardModel.withdrawalTypes.join('_')]
  charge.allowedCards = cardModel.allowed
  charge.cardsAsStrings = JSON.stringify(cardModel.allowed)
  charge.post_card_action = routeFor('create', chargeId)
  charge.id = chargeId
  charge.post_cancel_action = routeFor('cancel', chargeId)
}

var routeFor = (resource, chargeId) => {
  return paths.generateRoute(`card.${resource}`, {chargeId: chargeId})
}

var redirect = (res) => {
  return {
    toAuth3dsRequired: (chargeId) => res.redirect(303, routeFor('auth3dsRequired', chargeId)),
    toAuthWaiting: (chargeId) => res.redirect(303, routeFor('authWaiting', chargeId)),
    toConfirm: (chargeId) => res.redirect(303, routeFor('confirm', chargeId)),
    toNew: (chargeId) => res.redirect(303, routeFor('new', chargeId)),
    toReturn: (chargeId) => res.redirect(303, routeFor('return', chargeId))
  }
}

module.exports = {
  new: function (req, res) {
    var _views = views.create()
    var charge = normalise.charge(req.chargeData, req.chargeId)
    appendChargeForNewView(charge, req, charge.id)

    var init = function () {
      charge.countries = countries.retrieveCountries()
      if (charge.status === State.ENTERING_CARD_DETAILS) {
        return _views.display(res, CHARGE_VIEW, withAnalytics(charge, charge))
      }
      var chargeModel = Charge(req.headers[CORRELATION_HEADER])
      chargeModel.updateToEnterDetails(charge.id)
        .then(function () {
          _views.display(res, CHARGE_VIEW, withAnalytics(charge, charge))
        }, function () {
          _views.display(res, 'NOT_FOUND', withAnalyticsError())
        })
    }
    init()
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

      baseClient.post(authUrl, { payload: normalise.apiPayload(req, cardBrand), correlationId: correlationId }, function (err, data) {
        if (err) {
          return connectorNonResponsive(err)
        }
        logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'POST', authUrl, new Date() - startTime)
        var response = responses[data.statusCode]
        if (!response) return unknownFailure()
        response(_.get(data, 'body.status'))
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

    baseClient.post(connector3dsUrl, { payload: templateData, correlationId: correlationId },
      function (err, data) {
        if (err) {
          _views.display(res, 'ERROR', withAnalytics(charge))
          return
        }
        logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'POST', connector3dsUrl, new Date() - startTime)
        switch (data.statusCode) {
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
