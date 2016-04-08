'use strict';
module.exports = function(){
  var _charge = function(charge,chargeId){
    return {
      id: chargeId,
      amount: penceToPounds(charge.amount),
      return_url: charge.return_url,
      description: charge.description,
      links: charge.links,
      status: charge.status
    };
  },

  penceToPounds = function(pence){
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
        body.addressPostcode].filter(function(str){return str}).join(", ");

  },
  creditCard = function(creditCardNo){
    return creditCardNo.replace(/\D/g,'');
  },
  expiryDate = function(day, month){
    return day + "/" + month;
  };

  return {
    charge: _charge,
    addressForApi: addressForApi,
    addressLines: addressLines,
    addressForView: addressForView,
    creditCard: creditCard,
    expiryDate: expiryDate
  };

}();



