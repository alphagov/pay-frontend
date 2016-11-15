/*jslint node: true */
"use strict";
require('array.prototype.find');
var logger = require('winston');
var logging = require('../utils/logging.js');
var baseClient = require('../utils/base_client');

var _ = require('lodash');
var views = require('../utils/views.js');
var normalise = require('../services/normalise_charge.js');
var chargeValidator = require('../utils/charge_validation_backend.js');
var i18n = require('i18n');
var Charge = require('../models/charge.js');
var Card  = require('../models/card.js');
var State = require('../models/state.js');
var paths = require('../paths.js');
var CHARGE_VIEW = 'charge';
var CONFIRM_VIEW = 'confirm';
var AUTH_WAITING_VIEW = 'auth_waiting';
var CAPTURE_WAITING_VIEW = 'capture_waiting';
var preserveProperties = ['cardholderName','addressLine1', 'addressLine2', 'addressCity', 'addressPostcode', 'addressCountry'];
var countries = require("../services/countries.js");
var CORRELATION_HEADER = require('../utils/correlation_header.js').CORRELATION_HEADER;
var {withAnalyticsError, withAnalytics} = require('../utils/analytics.js');


var appendChargeForNewView = function(charge, req, chargeId){
    var cardModel             = Card(charge.gatewayAccount.cardTypes);
    var translation           = i18n.__("chargeController.withdrawalText");
    charge.withdrawalText     = translation[cardModel.withdrawalTypes.join("_")];
    charge.allowedCards       = cardModel.allowed;
    charge.cardsAsStrings     = JSON.stringify(cardModel.allowed);
    charge.post_card_action   = paths.card.create.path;
    charge.id                 = chargeId;
    charge.post_cancel_action = paths.generateRoute("card.cancel", {
      chargeId: chargeId
    });
};



module.exports = {
  new: function (req, res) {
    var _views = views.create(),
    charge     = normalise.charge(req.chargeData, req.chargeId);
    appendChargeForNewView(charge, req, charge.id);

    var init = function () {
      charge.countries = countries.retrieveCountries();
      if (charge.status === State.ENTERING_CARD_DETAILS) {
        return res.render(CHARGE_VIEW, withAnalytics(charge, charge));
      }
      var chargeModel = Charge(req.headers[CORRELATION_HEADER]);
      chargeModel.updateToEnterDetails(charge.id)
        .then(function () {
          res.render(CHARGE_VIEW, withAnalytics(charge, charge));
        }, function () {
          _views.display(res, "NOT_FOUND", withAnalyticsError());
        });
    };
    init();
  },

  create: function (req, res) {
    var charge    = normalise.charge(req.chargeData, req.chargeId);
    var _views    = views.create();

    var cardModel = Card(req.chargeData.gateway_account.card_types);
    var submitted = charge.status === State.AUTH_READY;
    var authUrl   = normalise.authUrl(charge);
    var chargeModel = Charge(req.headers[CORRELATION_HEADER]);

    var validator = chargeValidator(
      i18n.__("chargeController.fieldErrors"),
      logger,
      cardModel
    );

    normalise.addressLines(req.body);

    if (submitted) {
      return res.redirect(303, chargeModel.urlFor('authWaiting', req.chargeId));
    }

    var awaitingAuth = function() {
      logging.failedChargePost(409,authUrl);
      res.redirect(303, chargeModel.urlFor('authWaiting', req.chargeId));
    },

    successfulAuth = function() {
      res.redirect(303, chargeModel.urlFor('confirm', req.chargeId));
    },

    connectorFailure = function() {
      logging.failedChargePost(409,authUrl);
      _views.display(res, 'SYSTEM_ERROR', withAnalytics(
          charge,
          {returnUrl: paths.generateRoute('card.return', {chargeId: charge.id})}
      ));
    },

    unknownFailure = function() {
      res.redirect(303, chargeModel.urlFor('new', req.chargeId));
    },

    connectorNonResponsive = function (err) {
      logging.failedChargePostException(err);
      _views.display(res, "ERROR", withAnalytics(charge));
    },

    hasValidationError = function(validation){
      appendChargeForNewView(charge, req, charge.id);
      _.merge(validation, withAnalytics(charge, charge), _.pick(req.body, preserveProperties));
      return res.render(CHARGE_VIEW, validation);
    },

    responses = {
      202: awaitingAuth,
      409: awaitingAuth,
      204: successfulAuth,
      500: connectorFailure
    };

    function postAuth(authUrl, req, cardBrand) {
      var startTime = new Date();
      var correlationId = req.headers[CORRELATION_HEADER] || '';

      baseClient.post(authUrl, args, function (data, json) {
        logger.info('[%s] - %s to %s ended - total time %dms', correlationId ,'POST', authUrl, new Date() - startTime);
        var response = responses[json.statusCode];
        if (!response) return unknownFailure();
        response();
      }).on('error', connectorNonResponsive);
    }

    validator.verify(req).then(function(data){

      if (data.validation.hasError) return hasValidationError(data.validation);

      var cardBrand = data.cardBrand;

      logging.authChargePost(authUrl);
      var chargeModel = Charge(req.headers[CORRELATION_HEADER]);
      chargeModel.patch(req.chargeId, "replace", "email", req.body.email)
        .then(function () {
            postAuth(authUrl, req, cardBrand);
          }, function(err) {
            logging.failedChargePatch(err);
            _views.display(res, "ERROR", withAnalyticsError());
          }
      );
    }, unknownFailure);
  },

  checkCard: function(req, res) {

    var cardModel = Card(req.chargeData.gateway_account.card_types, req.headers[CORRELATION_HEADER]);
    cardModel.checkCard(normalise.creditCard(req.body.cardNo))
    .then(
      ()=>      { res.json({"accepted": true}); },
      (data)=>  { res.json({"accepted": false, "message": data }); }
    );
  },

  authWaiting: function (req, res) {
    var charge = normalise.charge(req.chargeData, req.chargeId);
    var _views;

    if (charge.status === State.AUTH_READY) {
      _views = views.create({
        success: {
          view: AUTH_WAITING_VIEW,
          locals: withAnalytics(charge)
        }
      });
      _views.display(res, "success");
    } else {
      res.redirect(303, paths.generateRoute('card.confirm', {chargeId: charge.id}));
    }
  },

  confirm: function (req, res) {
    var charge = normalise.charge(req.chargeData, req.chargeId),
      confirmPath = paths.generateRoute('card.confirm', {chargeId: charge.id}),
      _views = views.create({
        success: {
          view: CONFIRM_VIEW,
          locals: withAnalytics(charge, {
            charge: charge,
            confirmPath: confirmPath,
            gatewayAccount: {serviceName: charge.gatewayAccount.serviceName},
            post_cancel_action: paths.generateRoute("card.cancel", {chargeId: charge.id})
          })
        }
      });

    var init = function () {
      _views.display(res, 'success');
    };
    init();
  },

  capture: function (req, res) {
    var charge = normalise.charge(req.chargeData, req.chargeId);
    var _views = views.create();

    var init = function () {
        var chargeModel = Charge(req.headers[CORRELATION_HEADER]);
        chargeModel.capture(req.chargeId).then(function () {
          res.redirect(303, paths.generateRoute('card.return', {chargeId: charge.id}));
        }, captureFail);
      },

      captureFail = function (err) {
        if (err.message === 'CAPTURE_FAILED') return _views.display(res, 'CAPTURE_FAILURE', withAnalytics(charge));
        _views.display(res, 'SYSTEM_ERROR', withAnalytics(
            charge,
            {returnUrl: paths.generateRoute('card.return', {chargeId: charge.id})}
        ));
      };
    init();
  },

  captureWaiting: function (req, res) {
    var charge = normalise.charge(req.chargeData, req.chargeId);
    var _views = views.create();

    if (charge.status === State.CAPTURE_READY) {
      _views = views.create({
        success: {
          view: CAPTURE_WAITING_VIEW,
          locals: withAnalytics(charge)
        }
      });
      _views.display(res, "success");
    } else {
      _views.display(res, 'CAPTURE_SUBMITTED', withAnalytics(
          charge,
          {returnUrl: paths.generateRoute('card.return', {chargeId: charge.id})}
      ));
    }
  },

  cancel: function (req, res) {
    var charge = normalise.charge(req.chargeData, req.chargeId);

    var _views = views.create(),
      cancelFail = function () {
        _views.display(res, 'SYSTEM_ERROR', withAnalytics(
            charge,
            {returnUrl: paths.generateRoute('card.return', {chargeId: charge.id})}
        ));
      };

    var chargeModel = Charge(req.headers[CORRELATION_HEADER]);
    chargeModel.cancel(req.chargeId)
      .then(function () {
        return _views.display(res, 'USER_CANCELLED', withAnalytics(
            charge,
            {returnUrl: paths.generateRoute('card.return', {chargeId: charge.id})}
        ));
      }, cancelFail);
  }
};
