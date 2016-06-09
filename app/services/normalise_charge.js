module.exports = function() {
  "use strict";

  var _charge = function(charge,chargeId) {
    return {
      id: chargeId,
      amount: penceToPounds(charge.amount),
      return_url: charge.return_url,
      description: charge.description,
      links: charge.links,
      status: charge.status
    };
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
      country: 'GB'
    };
  },
  // body is passed by reference
  addressLines = function(body) {
    if (!body.addressLine1 && body.addressLine2) {
        body.addressLine1 = body.addressLine2;
        delete body.addressLine2;
    }
  },
  // an empty string is equal to false in soft equality used by filter
  addressForView = function(body) {
    return [body.addressLine1,
        body.addressLine2,
        body.addressCity,
        body.addressPostcode].filter(function(str){return str;}).join(", ");

  },

  creditCard = function(creditCardNo) {
    creditCardNo = (creditCardNo) ? creditCardNo : "";
    return creditCardNo.replace(/\D/g,'');
  },

  expiryDate = function(month, year){
    month = (month.length === 1) ? "0" + month : month;
    return month.slice(-2) + "/" + year.slice(-2);
  },
  apiPayload = function(req){
    return {
      headers: {"Content-Type": "application/json"},
      data: {
        'card_number': creditCard(req.body.cardNo),
        'cvc': req.body.cvc,
        'expiry_date': expiryDate(req.body.expiryMonth, req.body.expiryYear),
        'cardholder_name': req.body.cardholderName,
        'address': addressForApi(req.body)
      }
    };
  },

  authUrl = function(charge){
    var authLink = charge.links.find((link) => {return link.rel === 'cardAuth';});
    return authLink.href;
  };

  return {
    charge: _charge,
    addressForApi: addressForApi,
    addressLines: addressLines,
    addressForView: addressForView,
    creditCard: creditCard,
    expiryDate: expiryDate,
    apiPayload: apiPayload,
    authUrl: authUrl
  };
}();



