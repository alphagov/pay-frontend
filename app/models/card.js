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

module.exports.allowed = allowed;

var withdrawalTypes = []

if (_.filter(allowed,{debit: true}).length != 0) withdrawalTypes.push('debit');
if (_.filter(allowed,{credit: true}).length != 0) withdrawalTypes.push('credit');

module.exports.withdrawalTypes = withdrawalTypes;