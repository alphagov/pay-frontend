'use strict'

exports.hashOutCardNumber = cardNumber => {
  const hashedSize = cardNumber.length - 4
  const lastFour = cardNumber.substring(hashedSize)
  return new Array(hashedSize + 1).join('*') + lastFour
}
