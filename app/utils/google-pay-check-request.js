'use strict'

function getGooglePayMethodData (params) {
  return [{
    supportedMethods: 'https://google.com/pay',
    data: {
      environment: 'PRODUCTION',
      apiVersion: 2,
      apiVersionMinor: 0,
      merchantInfo: {
        merchantId: params.merchantId,
        merchantName: 'GOV.UK Pay'
      },
      transactionInfo: {
        totalPriceStatus: 'FINAL',
        totalPrice: 0.01,
        currencyCode: 'GBP'
      },
      allowedPaymentMethods: [
        {
          type: 'CARD',
          parameters: {
            allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
            allowedCardNetworks: params.allowedCardTypes
          },
          tokenizationSpecification: {
            type: 'PAYMENT_GATEWAY',
            parameters: {
              gateway: 'worldpay',
              gatewayMerchantId: params.gatewayMerchantId
            }
          }
        }
      ]
    }
  }]
}

module.exports = {
  getGooglePayMethodData,
  googlePayDetails: {
    total: {
      label: 'Checking for Google Pay',
      amount: {
        currency: 'GBP',
        value: 0.01
      }
    }
  }
}
