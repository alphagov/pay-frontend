'use strict'

// Mock Payment Request API stub
const getMockPaymentRequest = validPaymentRequestResponse => {
  return () => {
    return {
      canMakePayment: () => new Promise(resolve => resolve(true)),
      show: () => new Promise(resolve => resolve(validPaymentRequestResponse))
    }
  }
}

module.exports = {
  getMockPaymentRequest
}
