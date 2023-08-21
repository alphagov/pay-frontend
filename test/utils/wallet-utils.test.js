'use strict'

const { expect } = require('chai')

const { validChargeDetails } = require('../fixtures/payment.fixtures')
const { applePayEnabled, googlePayEnabled } = require('../../app/utils/wallet-utils')
const normalise = require('../../app/services/normalise-charge')

const gatewayAccountId = 6

describe('Wallet utils', () => {
  beforeEach(() => {
    delete process.env.WORLDPAY_APPLE_PAY_ENABLED
    delete process.env.WORLDPAY_GOOGLE_PAY_ENABLED
    delete process.env.STRIPE_APPLE_PAY_ENABLED
    delete process.env.STRIPE_GOOGLE_PAY_ENABLED
    delete process.env.PAY_TEST_GATEWAY_ACCOUNTS
  })

  describe('applePayEnabled', () => {
    describe('Worldpay account', () => {
      it('should return true if globally enabled for Worldpay and enabled for account', () => {
        process.env.WORLDPAY_APPLE_PAY_ENABLED = 'true'
        process.env.WORLDPAY_GOOGLE_PAY_ENABLED = 'false'
        process.env.STRIPE_APPLE_PAY_ENABLED = 'false'
        process.env.STRIPE_GOOGLE_PAY_ENABLED = 'false'
        const charge = createChargeWithApplePayEnabled('worldpay')
        expect(applePayEnabled(charge)).to.eq(true)
      })

      it('should return true if environment variable not set and enabled for account', () => {
        const charge = createChargeWithApplePayEnabled('worldpay')
        expect(applePayEnabled(charge)).to.eq(true)
      })

      it('should return false if globally disabled for Worldpay and account is not in test account list', () => {
        process.env.WORLDPAY_APPLE_PAY_ENABLED = 'false'
        process.env.PAY_TEST_GATEWAY_ACCOUNTS = ['33']
        const charge = createChargeWithApplePayEnabled('worldpay')
        expect(applePayEnabled(charge)).to.eq(false)
      })

      it('should return true if globally disabled for Worldpay but account is in test account list', () => {
        process.env.WORLDPAY_APPLE_PAY_ENABLED = 'false'
        process.env.PAY_TEST_GATEWAY_ACCOUNTS = [gatewayAccountId.toString()]

        const charge = createChargeWithApplePayEnabled('worldpay')
        expect(applePayEnabled(charge)).to.eq(true)
      })

      it('should return false if not enabled for account', () => {
        process.env.WORLDPAY_APPLE_PAY_ENABLED = 'true'
        const charge = createCharge('worldpay', false, true)
        expect(applePayEnabled(charge)).to.eq(false)
      })
    })

    describe('Stripe account', () => {
      it('should return true if globally enabled for Stripe and enabled for account', () => {
        process.env.WORLDPAY_APPLE_PAY_ENABLED = 'false'
        process.env.WORLDPAY_GOOGLE_PAY_ENABLED = 'false'
        process.env.STRIPE_APPLE_PAY_ENABLED = 'true'
        process.env.STRIPE_GOOGLE_PAY_ENABLED = 'false'
        const charge = createChargeWithApplePayEnabled('stripe')
        expect(applePayEnabled(charge)).to.eq(true)
      })

      it('should return true if environment variable not set and enabled for account', () => {
        const charge = createChargeWithApplePayEnabled('stripe')
        expect(applePayEnabled(charge)).to.eq(true)
      })

      it('should return false if globally disabled for Stripe and account is not in test account list', () => {
        process.env.STRIPE_APPLE_PAY_ENABLED = 'false'
        process.env.PAY_TEST_GATEWAY_ACCOUNTS = ['33']
        const charge = createChargeWithApplePayEnabled('stripe')
        expect(applePayEnabled(charge)).to.eq(false)
      })

      it('should return true if globally disabled for Stripe but account is in test account list', () => {
        process.env.STRIPE_APPLE_PAY_ENABLED = 'false'
        process.env.PAY_TEST_GATEWAY_ACCOUNTS = ['6']

        const charge = createChargeWithApplePayEnabled('stripe')
        expect(applePayEnabled(charge)).to.eq(true)
      })

      it('should return false if not enabled for account', () => {
        process.env.STRIPE_APPLE_PAY_ENABLED = 'true'
        const charge = createCharge('stripe', false, true)
        expect(applePayEnabled(charge)).to.eq(false)
      })
    })
  })

  describe('googlePayEnabled', () => {
    describe('Worldpay account', () => {
      it('should return true if globally enabled for Worldpay and enabled for account', () => {
        process.env.WORLDPAY_APPLE_PAY_ENABLED = 'false'
        process.env.WORLDPAY_GOOGLE_PAY_ENABLED = 'true'
        process.env.STRIPE_APPLE_PAY_ENABLED = 'false'
        process.env.STRIPE_GOOGLE_PAY_ENABLED = 'false'
        const charge = createChargeWithGooglePayEnabled('worldpay')
        expect(googlePayEnabled(charge)).to.eq(true)
      })

      it('should return true if environment variable not set and enabled for account', () => {
        const charge = createChargeWithGooglePayEnabled('worldpay')
        expect(googlePayEnabled(charge)).to.eq(true)
      })

      it('should return false if globally disabled for Worldpay and account is not in test account list', () => {
        process.env.WORLDPAY_GOOGLE_PAY_ENABLED = 'false'
        process.env.PAY_TEST_GATEWAY_ACCOUNTS = ['33']
        const charge = createChargeWithGooglePayEnabled('worldpay')
        expect(googlePayEnabled(charge)).to.eq(false)
      })

      it('should return true if globally disabled for Worldpay but account is in test account list', () => {
        process.env.WORLDPAY_GOOGLE_PAY_ENABLED = 'false'
        process.env.PAY_TEST_GATEWAY_ACCOUNTS = [gatewayAccountId.toString()]

        const charge = createChargeWithGooglePayEnabled('worldpay')
        expect(googlePayEnabled(charge)).to.eq(true)
      })

      it('should return false if not enabled for account', () => {
        process.env.WORLDPAY_GOOGLE_PAY_ENABLED = 'true'
        const charge = createCharge('worldpay', true, false)
        expect(googlePayEnabled(charge)).to.eq(false)
      })
    })

    describe('Stripe account', () => {
      it('should return true if globally enabled for Stripe and enabled for account', () => {
        process.env.WORLDPAY_APPLE_PAY_ENABLED = 'false'
        process.env.WORLDPAY_GOOGLE_PAY_ENABLED = 'false'
        process.env.STRIPE_APPLE_PAY_ENABLED = 'false'
        process.env.STRIPE_GOOGLE_PAY_ENABLED = 'true'
        const charge = createChargeWithGooglePayEnabled('stripe')
        expect(googlePayEnabled(charge)).to.eq(true)
      })

      it('should return true if environment variable not set and enabled for account', () => {
        const charge = createChargeWithGooglePayEnabled('stripe')
        expect(googlePayEnabled(charge)).to.eq(true)
      })

      it('should return false if globally disabled for Stripe and account is not in test account list', () => {
        process.env.STRIPE_GOOGLE_PAY_ENABLED = 'false'
        process.env.PAY_TEST_GATEWAY_ACCOUNTS = ['33']
        const charge = createChargeWithGooglePayEnabled('stripe')
        expect(googlePayEnabled(charge)).to.eq(false)
      })

      it('should return true if globally disabled for Stripe but account is in test account list', () => {
        process.env.STRIPE_GOOGLE_PAY_ENABLED = 'false'
        process.env.PAY_TEST_GATEWAY_ACCOUNTS = [gatewayAccountId.toString()]

        const charge = createChargeWithGooglePayEnabled('stripe')
        expect(googlePayEnabled(charge)).to.eq(true)
      })

      it('should return false if not enabled for account', () => {
        process.env.STRIPE_GOOGLE_PAY_ENABLED = 'true'
        const charge = createCharge('stripe', true, false)
        expect(googlePayEnabled(charge)).to.eq(false)
      })
    })
  })
})

function createChargeWithApplePayEnabled (paymentProvider) {
  return createCharge(paymentProvider, true, false)
}

function createChargeWithGooglePayEnabled (paymentProvider) {
  return createCharge(paymentProvider, false, true)
}

function createCharge (paymentProvider, allowApplePay, allowGooglePay) {
  const charge = validChargeDetails({
    paymentProvider,
    allowApplePay,
    allowGooglePay,
    gatewayAccountId
  })
  return normalise.charge(charge, charge.charge_id)
}
