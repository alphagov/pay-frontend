require('array.prototype.find');
var logger          = require('winston');
var luhn            = require('luhn');
var Client          = require('node-rest-client').Client;
var client          = new Client();
var _               = require('lodash');
var views           = require('../utils/views.js');
var session         = require('../utils/session.js');
var normalise       = require('../services/normalise_charge.js');
var validateCharge  = require('../utils/new_charge_validation.js');
var Charge          = require('../models/charge.js');
var paths           = require('../paths.js');
var hashCardNumber  = require('../utils/charge_utils.js').hashOutCardNumber;
var CHARGE_VIEW = 'charge',
CONFIRM_VIEW    = 'confirm';

module.exports.new = function(req, res) {
    var _views  = views.create(),
    charge      = normalise.charge(req.chargeData,req.chargeId);
    charge.post_card_action = paths.card.create.path;

    init = function() {
        Charge.updateToEnterDetails(charge.id)
        .then(function(){
            res.render(CHARGE_VIEW, charge);
        }, function(){
            _views.display(res,"NOT_FOUND");
        });
    };
    init();
};

module.exports.create = function(req, res) {
    var _views      = views.create(),
    charge          = normalise.charge(req.chargeData,req.chargeId),
    chargeSession   = session.retrieve(req, charge.id);
    normalise.addressLines(req.body);
    var checkResult = validateCharge(req.body);

    if (checkResult.hasError) {
         _.merge(checkResult, charge);
        checkResult.post_card_action = paths.card.create.path;
        res.render(CHARGE_VIEW, checkResult);
        return;
    }

    var plainCardNumber = normalise.creditCard(req.body.cardNo);
    var expiryDate = req.body.expiryDate;
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


    var authLink = charge.links.find((link)=> { return link.rel === 'cardAuth'; });
    var cardAuthUrl = authLink.href;

    client.post(cardAuthUrl, payload, function (data, connectorResponse) {
        logger.info('posting card details');
        switch (connectorResponse.statusCode) {
            case 204:
                logger.info('got response code 200 from connector');
                chargeSession.cardNumber = hashCardNumber(plainCardNumber);
                chargeSession.expiryDate = expiryDate;
                chargeSession.cardholderName = req.body.cardholderName;
                chargeSession.address = normalise.addressForView(req.body);
                chargeSession.serviceName = "Demo Service";
                res.redirect(303, paths.generateRoute(paths.card.confirm.path,{chargeId: charge.id}));
                return;
            case 500:
                logger.error('got response code 500 from connector');
                return _views.display(res,'SYSTEM_ERROR',{returnUrl: charge.return_url});
            default:
                res.redirect(303,paths.generateRoute(paths.card.new.path,{chargeId: charge.id}));
        }
    }).on('error', function (err) {
        logger.error('Exception raised calling connector: ' + err);
        _views.display(res,"ERROR");

    });
};

module.exports.confirm = function(req, res) {
    charge          = normalise.charge(req.chargeData,req.chargeId),
    chargeSession   = session.retrieve(req, charge.id),
    // REMOVE ONCE THESE DETAILS COME FROM CONNECTOR
    sessionValid    = session.validForConfirm(chargeSession),
    confirmPath     = paths.generateRoute(paths.card.confirm.path,{chargeId: charge.id}),
    _views = views.create({ success: {
        view: CONFIRM_VIEW,
            locals: {
                charge_id: charge.id,
                confirmPath: confirmPath,
                session: chargeSession,
                description: charge.description,
                amount: charge.amount
            }
    }});

    var init = function(){
        if (!sessionValid) return _views.display(res,'SESSION_INCORRECT');
        _views.display(res,'success');
    };
    init();
};

module.exports.capture = function (req, res) {
    var _views  = views.create(),
    returnUrl   = req.chargeData.return_url;

    var init = function(){
        Charge.capture(req.chargeId).
        then(function(){
            res.redirect(303, returnUrl);
        }, captureFail);
    },

    captureFail = function(err){
        if (err.message == 'CAPTURE_FAILED') return _views.display(res, 'CAPTURE_FAILURE');
        _views.display(res, 'SYSTEM_ERROR', { returnUrl: returnUrl });
    };
    init();
};
