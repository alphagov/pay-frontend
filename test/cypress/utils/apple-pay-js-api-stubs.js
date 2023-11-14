'use strict'

// Mock class for Apple Pay
const getMockApplePayClass = (validPaymentRequestResponse, email = null) => {
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
          { validationURL: 'https://fakeapple.url/fake-apple-merchant-validation' }
        )
      }

      if (this._onpaymentauthorized) {
        this._onpaymentauthorized(
          { payment: validPaymentRequestResponse(email) }
        )
      }
    }

    // eslint-disable-next-line accessor-pairs
    set onvalidatemerchant (value) {
      this._onvalidatemerchant = value
    }

    // eslint-disable-next-line accessor-pairs
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
