var _ = require('lodash');
var allowed = [
  {
    type: "visa",
    debit: true,
    credit: true
  },
  {
    type: "master-card",
    debit: true,
    credit: true
  },
  {
    type: "american-express",
    debit: true,
    credit: true
  },
  {
    type: "jcb",
    debit: true,
    credit: true
  },
  {
    type: "diners-club",
    debit: true,
    credit: true
  },
  {
    type: "discover",
    debit: true,
    credit: true
  }
];



module.exports = function(params){
  "use strict";
  var withdrawalTypes = [],
  cards = _.clone(allowed);

  if (params && params.debitOnly) {
    cards = _.map(cards, function(o) { o.credit = false; return o; });
  }

  if (params && params.removeAmex) {
    cards =  _.remove(cards, function(o) { return o.type !== "american-express"; });
  }


  if (_.filter(cards,{debit: true}).length !== 0) withdrawalTypes.push('debit');
  if (_.filter(cards,{credit: true}).length !== 0) withdrawalTypes.push('credit');

  return {
    withdrawalTypes: withdrawalTypes,
    allowed: cards
  };
};
