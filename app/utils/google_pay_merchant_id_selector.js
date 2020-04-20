const {
  GOOGLE_PAY_MERCHANT_ID,
  GOOGLE_PAY_MERCHANT_ID_2
} = process.env

const { gatewayAccountIdsForGooglePayMerchantId2 } = require('../../config/google_merchant_id_to_gateway_account_id')

const getMerchantId = (gatewayAccountId) => {
  if (GOOGLE_PAY_MERCHANT_ID_2 && gatewayAccountIdsForGooglePayMerchantId2.includes(gatewayAccountId)) {
    return GOOGLE_PAY_MERCHANT_ID_2
  } else {
    return GOOGLE_PAY_MERCHANT_ID
  }
}

module.exports = {
  getMerchantId
}