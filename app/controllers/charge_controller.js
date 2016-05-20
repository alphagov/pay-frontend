require('array.prototype.find');
var logger = require('winston');
var Client = require('node-rest-client').Client;
var client = new Client();
var _ = require('lodash');
var views = require('../utils/views.js');
var session = require('../utils/session.js');
var normalise = require('../services/normalise_charge.js');
var i18n = require('i18n');
var Charge = require('../models/charge.js');
var Card  = require('../models/card.js');
var State = require('../models/state.js');
var paths = require('../paths.js');
var hashCardNumber = require('../utils/charge_utils.js').hashOutCardNumber;
var CHARGE_VIEW = 'charge';
var CONFIRM_VIEW = 'confirm';
var AUTH_WAITING_VIEW = 'auth_waiting';
var preserveProperties = ['cardholderName','addressLine1', 'addressLine2', 'addressCity', 'addressPostcode'];

module.exports = {
  new: function (req, res) {
    "use strict";

    var _views = views.create(),
    charge     = normalise.charge(req.chargeData, req.chargeId);
    
    charge.allowedCards = Card.allowed;
    charge.allowedCardsAsString = JSON.stringify(Card.allowed);
    charge.post_card_action = paths.card.create.path;
    charge.post_cancel_action = paths.generateRoute("card.cancel", {chargeId: charge.id});

    var init = function () {
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
    "use strict";

    var charge = normalise.charge(req.chargeData, req.chargeId);
    if (charge.status === State.AUTH_READY) {
      res.redirect(303, paths.generateRoute('card.authWaiting', {chargeId: charge.id}));
      return;
    }

    var _views = views.create(),
      chargeSession = session.retrieve(req, charge.id);
    var validateCharge = require('../utils/charge_validation.js')(i18n.__("chargeController.fieldErrors"), logger,Card);
    normalise.addressLines(req.body);
    var checkResult = validateCharge.verify(req.body);

    if (checkResult.hasError) {
      _.merge(checkResult, charge, _.pick(req.body, preserveProperties));
      checkResult.post_card_action = paths.card.create.path;
      res.render(CHARGE_VIEW, checkResult);
      return;
    }

    var plainCardNumber = normalise.creditCard(req.body.cardNo);
    var expiryDate = normalise.expiryDate(req.body.expiryMonth, req.body.expiryYear);
    var payload = {
      headers: {"Content-Type": "application/json"},
      data: {
        'card_number': plainCardNumber,
        'cvc': req.body.cvc,
        'expiry_date': expiryDate,
        'cardholder_name': req.body.cardholderName,
        'address': normalise.addressForApi(req.body)
      }
    };

    var authLink = charge.links.find((link) => {return link.rel === 'cardAuth';});
    var cardAuthUrl = authLink.href;
    client.post(cardAuthUrl, payload, function (data, connectorResponse) {
      logger.info('posting card details');
      switch (connectorResponse.statusCode) {
        case 202:
        case 409:
          logger.info('got response code ' + connectorResponse.statusCode + ' from connector');
          session.store(
            chargeSession,
            hashCardNumber(plainCardNumber),
            expiryDate,
            req.body.cardholderName,
            normalise.addressForView(req.body));
          res.redirect(303, paths.generateRoute('card.authWaiting', {chargeId: charge.id}));
          return;
        case 204:
          logger.info('got response code 204 from connector');
          session.store(
            chargeSession,
            hashCardNumber(plainCardNumber),
            expiryDate,
            req.body.cardholderName,
            normalise.addressForView(req.body));
          res.redirect(303, paths.generateRoute('card.confirm', {chargeId: charge.id}));
          return;
        case 500:
          logger.error('got response code 500 from connector');
          return _views.display(res, 'SYSTEM_ERROR', {returnUrl: charge.return_url});
        default:
          res.redirect(303, paths.generateRoute('card.new', {chargeId: charge.id}));
      }
    }).on('error', function (err) {
      logger.error('Exception raised calling connector: ' + err);
      _views.display(res, "ERROR");

    });
  },

  authWaiting: function (req, res) {
    "use strict";
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
    "use strict";

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
    "use strict";

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
    "use strict";

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
