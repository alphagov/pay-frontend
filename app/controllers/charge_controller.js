require('array.prototype.find');
var logger = require('winston');
var luhn = require('luhn');

var Client = require('node-rest-client').Client;
var client = new Client();

var response = require('../utils/response.js').response;

var ERROR_MESSAGE = require('../utils/response.js').ERROR_MESSAGE;
var ERROR_VIEW = require('../utils/response.js').ERROR_VIEW;
var renderErrorView = require('../utils/response.js').renderErrorView;

module.exports.bindRoutesTo = function(app) {
  var CONFIRM_PATH = '/confirm';
  var CARD_DETAILS_PATH = '/card_details';

  var CHARGE_VIEW = 'charge';
  var CONFIRM_VIEW = 'confirm';

  var REQUIRED_FORM_FIELDS = {
    'cardNo': 'Card number',
    'cvc': 'CVC',
    'expiryDate': 'Expiry date',
    'cardholderName': 'Name on card',
    'addressLine1': 'Building name/number and street',
    'addressPostcode': 'Postcode'
  };

  function createChargeIdSessionKey(chargeId) {
    return 'ch_' + chargeId;
  }

  function validChargeIdInTheRequest(req, res, chargeId) {
    if(!chargeId) {
      logger.error('Unexpected: chargeId was not found in request.');
      response(req.headers.accept, res, ERROR_VIEW, {
        'message': ERROR_MESSAGE
      });
      return false;
    }

    return true;
  }

  function validChargeIdOnTheSession(req, res, chargeId) {
    if(!req.session_state[createChargeIdSessionKey(chargeId)]) {
      logger.error('Unexpected: chargeId=' + chargeId + ' could not be found on the session');
      response(req.headers.accept, res, ERROR_VIEW, {
        'message': ERROR_MESSAGE
      });
      return false;
    }

    return true;
  }

  app.get(CARD_DETAILS_PATH + '/:chargeId', function(req, res) {
    var chargeId = req.params.chargeId;

    if(
      !validChargeIdInTheRequest(req, res, chargeId) ||
      !validChargeIdOnTheSession(req, res, chargeId)
    ) {
      return;
    }

    var connectorUrl = process.env.CONNECTOR_URL.replace('{chargeId}', chargeId);

    client.get(connectorUrl, function(connectorData, connectorResponse) {

      if(connectorResponse.statusCode === 200) {
        logger.info('connector data = ', connectorData);
        var amountInPence = connectorData.amount;
        var uiAmount = (amountInPence / 100).toFixed(2);
        
        req.session_state.amount = amountInPence;

        response(req.headers.accept, res, CHARGE_VIEW, {
          'charge_id'        : chargeId,
          'amount'           : uiAmount,
          'service_url'      : connectorData.service_url,
          'post_card_action' : CARD_DETAILS_PATH
        });
        return;
      }

      renderErrorView(req, res, ERROR_MESSAGE);
    }).on('error', function(err) {
      logger.error('Exception raised calling connector: ' + err);
      response(req.headers.accept, res, ERROR_VIEW, {
        'message': ERROR_MESSAGE
      });
    });
  });

  app.post(CARD_DETAILS_PATH, function(req, res) {
    logger.info('POST ' + CARD_DETAILS_PATH);

    var chargeId = req.body.chargeId;

    if(
      !validChargeIdInTheRequest(req, res, chargeId) ||
      !validChargeIdOnTheSession(req, res, chargeId)
    ) {
      return;
    }

    var checkResult = validateNewCharge(normaliseAddress(req.body));
    if (checkResult.hasError) {
      renderErrorView(req, res, checkResult.errorMessage);
      return;
    }

    var plainCardNumber = removeWhitespaces(req.body.cardNo);
    var expiryDate = req.body.expiryDate;

    var payload = {
      headers:{"Content-Type": "application/json"},
      data: {
        'card_number': plainCardNumber,
        'cvc': req.body.cvc,
        'expiry_date': expiryDate,
        'cardholder_name': req.body.cardholderName,
        'address': addressFrom(req.body)
      }
    };

    var connectorUrl = process.env.CONNECTOR_URL.replace('{chargeId}', chargeId);
    client.get(connectorUrl, function(chargeData, chargeResponse) {
      var authLink = findLinkForRelation(chargeData.links, 'cardAuth');
      var cardAuthUrl = authLink.href;

      client.post(cardAuthUrl, payload, function(data, connectorResponse) {
  
        if(connectorResponse.statusCode === 204) {
          req.session_state.cardNumber = hashOutCardNumber(plainCardNumber);
          req.session_state.expiryDate = expiryDate;
          req.session_state.cardholderName = req.body.cardholderName;
          req.session_state.address = buildAddressLine(req.body);
          req.session_state.serviceName = "Demo Service";
          res.redirect(303, CARD_DETAILS_PATH + '/' + chargeId + CONFIRM_PATH);
          return;
        }
  
        renderErrorView(req,res, 'Payment could not be processed, please contact your issuing bank');
      }).on('error', function(err) {
        logger.error('Exception raised calling connector');
        response(req.headers.accept, res, ERROR_VIEW, {
          'message': ERROR_MESSAGE
        });
      });
    }).on('error', function(err) {
      logger.error('Exception raised calling connector');
      response(req.headers.accept, res, ERROR_VIEW, {
        'message': ERROR_MESSAGE
      });
    });
  });

  app.get(CARD_DETAILS_PATH + '/:chargeId' + CONFIRM_PATH, function(req, res) {

    if (!('amount' in req.session_state) ||
        !('expiryDate' in req.session_state) ||
        !('cardNumber' in req.session_state) ||
        !('cardholderName' in req.session_state) ||
        !('address' in req.session_state) ||
        !('serviceName' in req.session_state)) {
      renderErrorView(req,res, 'Session expired');
      return;
    }

    var amountInPence = req.session_state.amount;
    var uiAmount = (amountInPence / 100).toFixed(2);

    response(req.headers.accept, res, CONFIRM_VIEW, {
      'amount'    : uiAmount,
      'expiryDate': req.session_state.expiryDate,
      'cardNumber': req.session_state.cardNumber,
      'cardholderName' : req.session_state.cardholderName,
      'address' : req.session_state.address,
      'serviceName': req.session_state.serviceName,
      'backUrl': CARD_DETAILS_PATH + '/' + req.params.chargeId
    });
  });

  function findLinkForRelation(links, rel) {
    return links.find(function(link) {
      return link.rel === rel;
    });
  }

  function validateNewCharge(body) {
    var checkResult = {
      hasError: false,
      errorMessage: "The following fields are required:\n"
    };
    for (var key in REQUIRED_FORM_FIELDS) {
      if (!body[key]) {
        checkResult.hasError = true;
        checkResult.errorMessage += "* " + REQUIRED_FORM_FIELDS[key] + "\n";
      }
    }
    if (body['cardNo']) {
      if (!luhn.validate(body.cardNo)) {
        checkResult.hasError = true;
        checkResult.errorMessage = "You probably mistyped the card number. Please check and try again."
      }
    }

    return checkResult
  }

  function removeWhitespaces(s) {
    return s.replace(/\s/g, "")
  }

  function hashOutCardNumber(cardNumber) {
    return '************' + cardNumber.substring(12);
  }

  function normaliseAddress(body) {
    if (!body.addressLine1 && !body.addressLine2 && body.addressLine3) {
      body.addressLine1 = body.addressLine3;
      delete body.addressLine2;
      delete body.addressLine3;
    }
    if (!body.addressLine1 && body.addressLine2) {
      body.addressLine1 = body.addressLine2;
      body.addressLine2 = body.addressLine3;
      delete body.addressLine3
    }
    if (body.addressLine1 && !body.addressLine2 && body.addressLine3) {
      body.addressLine2 = body.addressLine3;
      delete body.addressLine3
    }
    return body;
  }

  function addressFrom(body) {
    return {
      'line1': body.addressLine1,
      'line2': body.addressLine2,
      'line3': body.addressLine3,
      'city': body.addressCity,
      'county': body.addressCounty,
      'postcode': body.addressPostcode,
      'country': 'GB'
    };
  }

  function buildAddressLine(body) {
    return [body.addressLine1,
      body.addressLine2,
      body.addressLine3,
      body.addressCity,
      body.addressCounty,
      body.addressPostcode].filter(notNullOrEmpty).join(", ");
  }

  function notNullOrEmpty(str) {
    return str;
  }
};
