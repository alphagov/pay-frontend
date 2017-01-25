var countries = require("../services/countries");
var humps = require("humps");
var normaliseCards = require('../services/normalise_cards.js');

module.exports = function() {
  "use strict";

  var _charge = function(charge,chargeId) {
    var chargeObj = {
      id: chargeId,
      amount: penceToPounds(charge.amount),
      service_return_url: charge.return_url,
      description: charge.description,
      links: charge.links,
      status: charge.status,
      email: charge.email,
      gatewayAccount: _normaliseGatewayAccountDetails(charge.gateway_account)
    };
     if (charge.card_details) {
       chargeObj.cardDetails = _normaliseConfirmationDetails(charge.card_details);
     }
     return chargeObj;
  },

  penceToPounds = function(pence) {
    return (parseInt(pence) / 100).toFixed(2);
  },

  addressForApi = function(body) {
    return {
      line1: body.addressLine1,
      line2: body.addressLine2,
      city: body.addressCity,
      postcode: body.addressPostcode,
      country: body.addressCountry
    };
  },
  // body is passed by reference
  addressLines = function(body) {
    if (!body.addressLine1 && body.addressLine2) {
        body.addressLine1 = body.addressLine2;
        delete body.addressLine2;
    }
  },

  _normaliseConfirmationDetails = function(cardDetails){
    cardDetails.cardNumber = '************' + cardDetails.last_digits_card_number;
    delete cardDetails.last_digits_card_number;
    var normalisedDetails = humps.camelizeKeys(cardDetails);
    normalisedDetails.billingAddress = _normaliseAddress(cardDetails.billing_address);
    return normalisedDetails;
  },

  _normaliseAddress = function(address) {
    return [address.line1,
      address.line2,
      address.city,
      address.postcode,
      countries.translateAlpha2(address.country)].filter(function(str){return str;}).join(", ");
  },

  _normaliseGatewayAccountDetails = function (accountDetails) {
    var gatewayAccountDetails = humps.camelizeKeys(accountDetails);
    gatewayAccountDetails.cardTypes = normaliseCards(gatewayAccountDetails.cardTypes);
    return gatewayAccountDetails;
  },

  // an empty string is equal to false in soft equality used by filter
  addressForView = function(body) {
    return [body.addressLine1,
        body.addressLine2,
        body.addressCity,
        body.addressPostcode,
        countries.translateAlpha2(body.addressCountry)].filter(function(str){return str;}).join(", ");
  },

  creditCard = function(creditCardNo) {
    creditCardNo = (creditCardNo) ? creditCardNo : "";
    return creditCardNo.replace(/\D/g,'');
  },

  expiryDate = function(month, year){
    month = (month.length === 1) ? "0" + month : month;
    return month.slice(-2) + "/" + year.slice(-2);
  },

  apiPayload = function(req, cardBrand){
    return {
      'card_number': creditCard(req.body.cardNo),
      'cvc': req.body.cvc,
      'card_brand': cardBrand,
      'expiry_date': expiryDate(req.body.expiryMonth, req.body.expiryYear),
      'cardholder_name': req.body.cardholderName,
      'address': addressForApi(req.body),
      'accept_header': req.header("accept"),
      'user_agent_header': req.header("user-agent")
    };
  },

  authUrl = function(charge){
    var authLink = charge.links.find((link) => {return link.rel === 'cardAuth';});
    return authLink.href;
  },

  chargeUrl = function(charge){
    var selfLink = charge.links.find((link) => {return link.rel === 'self';});
    return selfLink.href;
  };

  return {
    charge: _charge,
    addressForApi: addressForApi,
    addressLines: addressLines,
    addressForView: addressForView,
    creditCard: creditCard,
    expiryDate: expiryDate,
    apiPayload: apiPayload,
    authUrl: authUrl,
    chargeUrl: chargeUrl
  };
}();



