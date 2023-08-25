'use strict'

const sinon = require('sinon')
const proxyquire = require('proxyquire')

const merchantDomain = 'www.pymnt.uk'
const worldpayMerchantId = 'worldpay.merchant.id'
const worldpayCertificate = 'A-WORLDPAY-CERTIFICATE'
const worldpayKey = 'A-WORLDPAY-KEY'
const stripeMerchantId = 'stripe.merchant.id'
const stripeCertificate = 'A-STRIPE-CERTIFICATE'
const stripeKey = 'A-STRIPE-KEY'
const url = 'https://fakeapple.url'

const appleResponse = { status: 200 }
const appleResponseBody = { foo: 'bar' }

function getControllerWithMocks (requestMock) {
  return proxyquire('../../../../app/controllers/web-payments/apple-pay/merchant-validation.controller', {
    requestretry: requestMock
  })
}

describe('Validate with Apple the merchant is legitimate', () => {
  let res, sendSpy

  beforeEach(() => {
    process.env.APPLE_PAY_MERCHANT_DOMAIN = merchantDomain
    process.env.WORLDPAY_APPLE_PAY_MERCHANT_ID = worldpayMerchantId
    process.env.WORLDPAY_APPLE_PAY_MERCHANT_ID_CERTIFICATE = worldpayCertificate
    process.env.WORLDPAY_APPLE_PAY_MERCHANT_ID_CERTIFICATE_KEY = worldpayKey
    process.env.STRIPE_APPLE_PAY_MERCHANT_ID = stripeMerchantId
    process.env.STRIPE_APPLE_PAY_MERCHANT_ID_CERTIFICATE = stripeCertificate
    process.env.STRIPE_APPLE_PAY_MERCHANT_ID_CERTIFICATE_KEY = stripeKey

    sendSpy = sinon.spy()
    res = {
      status: sinon.spy(() => ({ send: sendSpy })),
      sendStatus: sinon.spy()
    }
  })

  it('should return a payload for a Worldpay payment if Merchant is valid', async () => {
    const mockRequest = sinon.stub().yields(null, appleResponse, appleResponseBody)
    const controller = getControllerWithMocks(mockRequest)

    const req = {
      body: {
        url,
        paymentProvider: 'worldpay'
      }
    }
    await controller(req, res)

    sinon.assert.calledWith(mockRequest, {
      url,
      body: {
        merchantIdentifier: worldpayMerchantId,
        displayName: 'GOV.UK Pay',
        initiative: 'web',
        initiativeContext: merchantDomain
      },
      method: 'post',
      json: true,
      cert: `-----BEGIN CERTIFICATE-----
${worldpayCertificate}
-----END CERTIFICATE-----`,
      key: `-----BEGIN PRIVATE KEY-----
${worldpayKey}
-----END PRIVATE KEY-----`
    })
    sinon.assert.calledWith(res.status, 200)
    sinon.assert.calledWith(sendSpy, appleResponseBody)
  })

  it('should return a payload for a Stripe payment if Merchant is valid', async () => {
    const mockRequest = sinon.stub().yields(null, appleResponse, appleResponseBody)
    const controller = getControllerWithMocks(mockRequest)

    const req = {
      body: {
        url,
        paymentProvider: 'stripe'
      }
    }
    await controller(req, res)

    sinon.assert.calledWith(mockRequest, {
      url,
      body: {
        merchantIdentifier: stripeMerchantId,
        displayName: 'GOV.UK Pay',
        initiative: 'web',
        initiativeContext: merchantDomain
      },
      method: 'post',
      json: true,
      cert: `-----BEGIN CERTIFICATE-----
${stripeCertificate}
-----END CERTIFICATE-----`,
      key: `-----BEGIN PRIVATE KEY-----
${stripeKey}
-----END PRIVATE KEY-----`
    })
    sinon.assert.calledWith(res.status, 200)
    sinon.assert.calledWith(sendSpy, appleResponseBody)
  })

  it('should return 400 if no url is provided', async () => {
    const mockRequest = sinon.stub().yields(null, appleResponse, appleResponseBody)
    const controller = getControllerWithMocks(mockRequest)

    const req = {
      body: {
        paymentProvider: 'worldpay'
      }
    }
    await controller(req, res)
    sinon.assert.calledWith(res.sendStatus, 400)
  })

  it('should return 400 for unexpected payment provider', async () => {
    const mockRequest = sinon.stub().yields(null, appleResponse, appleResponseBody)
    const controller = getControllerWithMocks(mockRequest)

    const req = {
      body: {
        url,
        paymentProvider: 'sandbox'
      }
    }
    await controller(req, res)
    sinon.assert.calledWith(res.sendStatus, 400)
  })

  it('should return an error if Apple Pay returns an error', async () => {
    const mockRequest = sinon.stub().yields(new Error(), appleResponse, appleResponseBody)
    const controller = getControllerWithMocks(mockRequest)

    const req = {
      body: {
        url,
        paymentProvider: 'worldpay'
      }
    }
    await controller(req, res)
    sinon.assert.calledWith(res.status, 500)
    sinon.assert.calledWith(sendSpy, appleResponseBody)
  })
})
