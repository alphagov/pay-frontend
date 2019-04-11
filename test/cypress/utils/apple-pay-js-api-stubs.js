'use strict'

// Mock class for Apple Pay
const getMockApplePayClass = (validPaymentRequestResponse, email) => {
  class MockApplePaySession {
    completePayment () {
      return true
    }

    completeMerchantValidation () {
      return true
    }

    begin () {
      if (this._onvalidatemerchant) {
        this._onvalidatemerchant(
          { validationURL: 'https://fakeapple.url' }
        )
      }

      if (this._onpaymentauthorized) {
        this._onpaymentauthorized(
          { payment: validPaymentRequestResponse(email) }
        )
      }
    }

    set onvalidatemerchant (value) {
      this._onvalidatemerchant = value
    }

    set onpaymentauthorized (value) {
      this._onpaymentauthorized = value
    }
  }

  // Mock function to trick JS into thinking Apple Pay is available
  MockApplePaySession.canMakePayments = () => true
  MockApplePaySession.supportsVersion = () => true

  return MockApplePaySession
}

const MockApplePayError = () => true

module.exports = {
  getMockApplePayClass,
  MockApplePayError
}
