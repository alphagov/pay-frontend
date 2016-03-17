require('array.prototype.find');
var logger          = require('winston');
var luhn            = require('luhn');
var Client          = require('node-rest-client').Client;
var client          = new Client();
var views           = require('../utils/views.js');
var chargeParam     = require('../services/charge_param_retriever.js');
var normalise       = require('../services/normalise_charge.js');
var Charge          = require('../models/charge.js');
var _               = require('lodash');
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
    chargeSession   = chargeState(req, charge.id);
    normalise.addressLines(req.body);
    var checkResult = validateNewCharge(req.body);

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


    var authLink = findLinkForRelation(charge.links, 'cardAuth');
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
                res.redirect(303,paths.generateRoute(paths.card.new.path,{chargeId: charge.id}))
        }
    }).on('error', function (err) {
        logger.error('Exception raised calling connector: ' + err);
        _views.display(res,"ERROR");

    });
}

module.exports.confirm = function(req, res) {
    charge          = normalise.charge(req.chargeData,req.chargeId),
    chargeSession   = chargeState(req, charge.id),
    sessionValid    = validSession(chargeSession),
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
}

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
        if (err.message == 'AUTH_FAILED') return _views.display(res, 'ERROR', {
            message: "There was a problem processing your payment. Please contact the service."
        });
        _views.display(res, 'SYSTEM_ERROR', { returnUrl: returnUrl });
    };
    init();
}


// none of the following really belongs in the controller


var REQUIRED_FORM_FIELDS = {
    cardholderName: {
        id: 'cardholder-name',
        name: 'Name on card',
        message: 'Please enter the name as it appears on the card' },
    cardNo: {
        id: 'card-no',
        name: 'Card number',
        message: 'Please enter the long number on the front of your card' },
    cvc: {
        id: 'cvc',
        name: 'CVC',
        message: 'Please enter your card security code' },
    expiryDate: {
        id: 'expiry-date',
        name: 'Expiry date',
        message: 'Please enter a valid expiry date' },
    addressLine1: {
        id: 'address-line1',
        name: 'Building name/number and street',
        message:'Please enter your address' },
    addressPostcode: {
        id: 'address-postcode',
        name: 'Postcode',
        message: 'Please enter a valid postcode' }
};

function createChargeIdSessionKey(chargeId) {
    return 'ch_' + chargeId;
}

function chargeState(req, chargeId) {
    return req.frontend_state[createChargeIdSessionKey(chargeId)];
}

function validSession(chargeSession) {
    var required = ['expiryDate', 'cardNumber', 'cardholderName', 'address', 'serviceName']

    for (key = 0; key < required.length; key++) {
        if (!_.has(chargeSession,required[key])) return false
    }
    return true
}


function findLinkForRelation(links, rel) {
    return links.find(function (link) {
        return link.rel === rel;
    });
}

function validateNewCharge(body) {
    var checkResult = {
        hasError: false,
        errorMessage: "The following fields are missing or contain errors",
        errorFields: [],
        highlightErrorFields: {}
    };
    for (var field in REQUIRED_FORM_FIELDS) {
        var fieldInBody = body[field];
        var cardNoInvalid = (field === 'cardNo' && !luhn.validate(body[field]));

        if (!fieldInBody || cardNoInvalid) {
            var errorType = !fieldInBody? ' is missing': ' is invalid';
            checkResult.hasError = true;
            checkResult.errorFields.push({
                key: REQUIRED_FORM_FIELDS[field].id,
                value: REQUIRED_FORM_FIELDS[field].name + errorType
            });
            checkResult.highlightErrorFields[field] = REQUIRED_FORM_FIELDS[field].message;
        }
    }
    logger.info("Card details check result: "+JSON.stringify(checkResult));
    return checkResult
}



