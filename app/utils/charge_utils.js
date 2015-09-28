var logger = require('winston');

module.exports = {
    hashOutCardNumber: function (cardNumber) {
        var hashedSize = cardNumber.length - 4;
        var lastFour = cardNumber.substring(hashedSize);
        return new Array(hashedSize + 1).join('*') + lastFour;
    }
};