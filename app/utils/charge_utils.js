module.exports = {
  hashOutCardNumber: function (cardNumber) {
    'use strict'

    var hashedSize = cardNumber.length - 4
    var lastFour = cardNumber.substring(hashedSize)
    return new Array(hashedSize + 1).join('*') + lastFour
  }
}
