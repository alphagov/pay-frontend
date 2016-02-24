var logger = require('winston');
var CARD_DETAILS_PATH = '/card_details';  // TODO PP-545 SHOULD MOVE TO VIEW

module.exports = function(){
  var _charge = function(charge,chargeId){
    return {
      'charge_id': chargeId,
      'amount': penceToPounds(charge.amount),
      'return_url': charge.return_url,
      'paymentDescription': charge.description,
      'post_card_action': CARD_DETAILS_PATH
    };
  },

  penceToPounds = function(pence){
    return (parseInt(pence) / 100).toFixed(2);
  };

  return {
    charge: _charge,
    penceToPounds: penceToPounds
  }

}();



