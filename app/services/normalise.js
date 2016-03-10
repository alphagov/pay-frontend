var logger = require('winston');
var paths = require('../paths.js');


module.exports = function(){
  var _charge = function(charge,chargeId){
    return {
      'charge_id': chargeId,
      'amount': penceToPounds(charge.amount),
      'return_url': charge.return_url,
      'paymentDescription': charge.description,
      'post_card_action': paths.card.create
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



