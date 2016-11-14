var baseClient = require("./base_client");

var cardUrl = process.env.CARDID_HOST + "/v1/api/card";

module.exports = {
  post: function(args, callBack) {
    return baseClient.post(cardUrl, args, callBack);
  },

  CARD_URL: cardUrl
};
