/*jslint node: true */
"use strict";
require('array.prototype.find');
var logger = require('winston');
var logging = require('../utils/logging.js');
var Client = require('node-rest-client').Client;
var client = new Client();
var _ = require('lodash');
var views = require('../utils/views.js');
var session = require('../utils/session.js');
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
var preserveProperties = ['cardholderName','addressLine1', 'addressLine2', 'addressCity', 'addressPostcode'];

var appendChargeForNewView = function(charge, req, chargeId){
    var cardModel             = Card(session.retrieve(req,chargeId).cardTypes);
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
      if (charge.status === State.ENTERING_CARD_DETAILS) {
        return res.render(CHARGE_VIEW, charge);
      }
      Charge.updateToEnterDetails(charge.id)
        .then(function () {
          res.render(CHARGE_VIEW, charge);
        }, function () {
          _views.display(res, "NOT_FOUND");
        });
    };
    init();
  },

  create: function (req, res) {

    var charge    = normalise.charge(req.chargeData, req.chargeId);
    var _views    = views.create();
    var cardModel = Card(session.retrieve(req,charge.id).cardTypes);
    var submitted = charge.status === State.AUTH_READY;
    var authUrl   = normalise.authUrl(charge);
    var validator = chargeValidator(
      i18n.__("chargeController.fieldErrors"),
      logger,
      cardModel
    );
    var checkResult;
    normalise.addressLines(req.body);

    if (submitted) {
      return res.redirect(303, Charge.urlFor('authWaiting', req.chargeId));
    }

    var awaitingAuth = function() {
      logging.failedChargePost(409,authUrl);
      session.store(req);
      res.redirect(303, Charge.urlFor('authWaiting', req.chargeId));
    },

    successfulAuth = function() {
      session.store(req);
      res.redirect(303, Charge.urlFor('confirm', req.chargeId));
    },

    connectorFailure = function() {
      logging.failedChargePost(409,authUrl);
      _views.display(res, 'SYSTEM_ERROR', {returnUrl: charge.return_url});
    },

    unknownFailure = function(err) {
      console.log('UNKOWN ERROR',err);
      res.redirect(303, Charge.urlFor('new', req.chargeId));
    },

    connectorNonResponsive = function (err) {
      logging.failedChargePostException(err);
      _views.display(res, "ERROR");

    },

    hasValidationError = function(){
      appendChargeForNewView(charge, req, charge.id);
      _.merge(checkResult, charge, _.pick(req.body, preserveProperties));
      return res.render(CHARGE_VIEW, checkResult);
    };

    var responses = {
      202: awaitingAuth,
      409: awaitingAuth,
      204: successfulAuth,
      500: connectorFailure
    };

    validator.verify(req).then(function(check){
      checkResult = check;
      console.error("AUTHING",checkResult);
      if (checkResult.hasError) return hasValidationError();
      logging.authChargePost(authUrl);
      client.post(authUrl, normalise.apiPayload(req), function (data, json) {
        console.error("AUTHING",json.statusCode);
        var response = responses[json.statusCode];
        if (!response) return unknownFailure();
        response();
      }).on('error', connectorNonResponsive);
    },unknownFailure);

  },

  checkCard: function(req, res) {
    var charge    = normalise.charge(req.chargeData, req.chargeId);
    var cardModel = Card(session.retrieve(req,charge.id).cardTypes);
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
          locals: {}
        }
      });
      _views.display(res, "success");
    } else {
      res.redirect(303, paths.generateRoute('card.confirm', {chargeId: charge.id}));
    }
  },

  confirm: function (req, res) {

    var charge = normalise.charge(req.chargeData, req.chargeId),
      chargeSession = session.retrieve(req, charge.id),
      confirmPath = paths.generateRoute('card.confirm', {chargeId: charge.id}),
      _views = views.create({
        success: {
          view: CONFIRM_VIEW,
          locals: {
            charge_id: charge.id,
            confirmPath: confirmPath,
            session: chargeSession,
            description: charge.description,
            amount: charge.amount,
            post_cancel_action: paths.generateRoute("card.cancel", {chargeId: charge.id})
          }
        }
      });

    var init = function () {
      _views.display(res, 'success');
    };
    init();
  },

  capture: function (req, res) {

    var _views = views.create(),
      returnUrl = req.chargeData.return_url;

    var init = function () {
        Charge.capture(req.chargeId).then(function () {
          res.redirect(303, returnUrl);
        }, captureFail);
      },

      captureFail = function (err) {
        if (err.message === 'CAPTURE_FAILED') return _views.display(res, 'CAPTURE_FAILURE');
        _views.display(res, 'SYSTEM_ERROR', {returnUrl: returnUrl});
      };
    init();
  },

  cancel: function (req, res) {

    var _views = views.create(),
      returnUrl = req.chargeData.return_url,
      cancelFail = function () {
        _views.display(res, 'SYSTEM_ERROR', {returnUrl: returnUrl});
      };

    Charge.cancel(req.chargeId)
      .then(function () {
        return _views.display(res, 'USER_CANCELLED', {
          returnUrl: returnUrl
        });
      }, cancelFail);
  }
};
