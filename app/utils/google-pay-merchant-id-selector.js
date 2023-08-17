const {
  GOOGLE_PAY_MERCHANT_ID,
  GOOGLE_PAY_MERCHANT_ID_2,
  GATEWAY_ACCOUNT_IDS_FOR_GOOGLE_PAY_MERCHANT_ID_2
} = process.env

const getMerchantId = (gatewayAccountId) => {
  let gatewayAccountIdsForGooglePayMerchantId2 = []

  if (GATEWAY_ACCOUNT_IDS_FOR_GOOGLE_PAY_MERCHANT_ID_2) {
    gatewayAccountIdsForGooglePayMerchantId2 = GATEWAY_ACCOUNT_IDS_FOR_GOOGLE_PAY_MERCHANT_ID_2.trim().split(' ')
  }

  if (GOOGLE_PAY_MERCHANT_ID_2 && gatewayAccountIdsForGooglePayMerchantId2.includes(gatewayAccountId.toString())) {
    return GOOGLE_PAY_MERCHANT_ID_2
  } else {
    return GOOGLE_PAY_MERCHANT_ID
  }
}

module.exports = {
  getMerchantId
}
