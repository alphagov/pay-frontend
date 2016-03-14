require('array.prototype.find');
var logger          = require('winston');
var luhn            = require('luhn');
var Client          = require('node-rest-client').Client;
var client          = new Client();
var views           = require('../utils/views.js');
var chargeParam     = require('../services/charge_param_retriever.js');
var normalise       = require('../services/normalise.js');
var Charge          = require('../models/charge.js');
var _               = require('lodash');
var paths           = require('../paths.js');
var stateCheck      = require('../utils/state_check.js');
var hashCardNumber  = require('../utils/charge_utils.js').hashOutCardNumber;

module.exports.new = function(req, res) {
    var _views  = views.create(),
    chargeId    = req.chargeId,
    chargeData  = req.chargeData;

    init = function() {
        setChargeSession(req,chargeId,chargeData);
        Charge.updateToEnterDetails(chargeId)
        .then(function(){
            res.render(CHARGE_VIEW, normalise.charge(chargeData,chargeId));
        }, function(){
            _views.display(res,"NOT_FOUND");
        });
    },

    setChargeSession = function(req,chargeId,data) {
        var chargeSession = chargeState(req, chargeId);
        chargeSession.amount = normalise.penceToPounds(data.amount);
        chargeSession.paymentDescription = data.description;
    };

    init();
}

module.exports.create = function(req, res) {
    var _views  = views.create(),
    chargeId    = req.chargeId,
    chargeData  = req.chargeData;
    var checkResult = validateNewCharge(normaliseAddress(req.body));

    var chargeSession = chargeState(req, chargeId);

    if (checkResult.hasError) {
        checkResult.charge_id = chargeId;
        checkResult.paymentDescription = chargeSession.paymentDescription;
        checkResult.amount = req.body.hiddenAmount;
        checkResult.return_url = req.body.returnUrl;
        checkResult.post_card_action = paths.card.create.path;
        res.render(CHARGE_VIEW, checkResult);
        return;
    }

    var plainCardNumber = removeWhitespaces(req.body.cardNo);
    var expiryDate = req.body.expiryDate;
    var payload = {
        headers: {"Content-Type": "application/json"},
        data: {
            'card_number': plainCardNumber,
            'cvc': req.body.cvc,
            'expiry_date': expiryDate,
            'cardholder_name': req.body.cardholderName,
            'address': addressFrom(req.body)
        }
    };



    var authLink = findLinkForRelation(chargeData.links, 'cardAuth');
    var cardAuthUrl = authLink.href;

    client.post(cardAuthUrl, payload, function (data, connectorResponse) {
        logger.info('posting card details');
        switch (connectorResponse.statusCode) {
            case 204:
                logger.info('got response code 200 from connector');
                chargeSession.cardNumber = hashCardNumber(plainCardNumber);
                chargeSession.expiryDate = expiryDate;
                chargeSession.cardholderName = req.body.cardholderName;
                chargeSession.address = buildAddressLine(req.body);
                chargeSession.serviceName = "Demo Service";
                res.redirect(303, paths.generateRoute(paths.card.confirm.path,{chargeId: chargeId}));
                return;
            case 500:
                logger.error('got response code 500 from connector');
                return _views.display(res,'SYSTEM_ERROR',{returnUrl: chargeData.return_url});
            default:
                res.redirect(303,paths.generateRoute(paths.card.new.path,{chargeId: chargeId}))
        }
    }).on('error', function (err) {
        logger.error('Exception raised calling connector: ' + err);
        _views.display(res,"ERROR");

    });
}

module.exports.confirm = function(req, res) {
    var chargeId    = req.chargeId,
    chargeData      = req.chargeData,
    chargeSession   = chargeState(req, chargeId),
    sessionValid    = validSession(chargeSession),
    confirmPath     = paths.generateRoute(paths.card.confirm.path,{chargeId: chargeId}),
    _views = views.create({ success: {
        view: CONFIRM_VIEW,
            locals: {
                'charge_id': chargeId,
                'confirmPath': confirmPath,
                session: chargeSession
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

var CHARGE_VIEW = 'charge';
var CONFIRM_VIEW = 'confirm';

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
    if (
        !('amount' in chargeSession) ||
        !('paymentDescription' in chargeSession) ||
        !('expiryDate' in chargeSession) ||
        !('cardNumber' in chargeSession) ||
        !('cardholderName' in chargeSession) ||
        !('address' in chargeSession) ||
        !('serviceName' in chargeSession)
    ) {
        return false;
    }
    return true;
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

function removeWhitespaces(s) {
    return s.replace(/\s/g, "")
}

function normaliseAddress(body) {
    if (!body.addressLine1 && body.addressLine2) {
        body.addressLine1 = body.addressLine2;
        delete body.addressLine2;
    }
    return body;
}

function addressFrom(body) {
    return {
        'line1': body.addressLine1,
        'line2': body.addressLine2,
        'city': body.addressCity,
        'postcode': body.addressPostcode,
        'country': 'GB'
    };
}

function buildAddressLine(body) {
    return [body.addressLine1,
        body.addressLine2,
        body.addressCity,
        body.addressPostcode].filter(notNullOrEmpty).join(", ");
}

function notNullOrEmpty(str) {
    return str;
}

