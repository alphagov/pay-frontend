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

const appleResponse = { status: 200, data: { foo: 'bar' } }

const hpagentMock = {
  HttpsProxyAgent: sinon.stub().returns({})
}

function getControllerWithMocks (axiosMock) {
  return proxyquire('../../../../app/controllers/web-payments/apple-pay/merchant-validation.controller', {
    axios: axiosMock,
    hpagent: hpagentMock
  })
}

describe('Validate with Apple the merchant is legitimate', () => {
  let res, sendSpy

  beforeEach(() => {
    delete process.env.HTTPS_PROXY

    process.env.APPLE_PAY_MERCHANT_DOMAIN = merchantDomain
    process.env.WORLDPAY_APPLE_PAY_MERCHANT_ID = worldpayMerchantId
    process.env.WORLDPAY_APPLE_PAY_MERCHANT_ID_CERTIFICATE = worldpayCertificate
    process.env.WORLDPAY_APPLE_PAY_MERCHANT_ID_CERTIFICATE_KEY = worldpayKey
    process.env.STRIPE_APPLE_PAY_MERCHANT_ID = stripeMerchantId
    process.env.STRIPE_APPLE_PAY_MERCHANT_ID_CERTIFICATE = stripeCertificate
    process.env.STRIPE_APPLE_PAY_MERCHANT_ID_CERTIFICATE_KEY = stripeKey
    process.env.APPLE_PAY_MERCHANT_VALIDATION_VIA_AXIOS = 'true'

    sendSpy = sinon.spy()
    res = {
      status: sinon.spy(() => ({ send: sendSpy })),
      sendStatus: sinon.spy()
    }
  })

  describe('when running locally with no proxy', () => {
    it('should return a payload for a Worldpay payment if Merchant is valid', async () => {
      const axiosStub = sinon.stub().resolves(appleResponse)
      const controller = getControllerWithMocks(axiosStub)

      const req = {
        body: {
          url,
          paymentProvider: 'worldpay'
        }
      }
      await controller(req, res)

      sinon.assert.calledOnce(axiosStub)
      const axiosCallArg = axiosStub.getCall(0).args[0]

      sinon.assert.match(axiosCallArg, {
        url: url,
        method: 'post',
        cert: sinon.match(cert => cert.includes(worldpayCertificate)),
        key: sinon.match(key => key.includes(worldpayKey)),
        headers: { 'Content-Type': 'application/json' },
        data: {
          merchantIdentifier: worldpayMerchantId,
          displayName: 'GOV.UK Pay',
          initiative: 'web',
          initiativeContext: merchantDomain
        }
      })

      sinon.assert.calledWith(res.status, 200)
      sinon.assert.calledWith(sendSpy, appleResponse.data)
    })
  })

  describe('when there is a proxy', () => {
    beforeEach(() => {
      process.env.HTTPS_PROXY = 'https://fakeproxy.com'
    })

    it('should return a payload for a Worldpay payment if Merchant is valid', async () => {
      const axiosPostStub = sinon.stub().resolves(appleResponse)
      const axiosCreateStub = sinon.stub().returns({ post: axiosPostStub })
      const axiosStub = {
        create: axiosCreateStub
      }
      const controller = getControllerWithMocks(axiosStub)

      const req = {
        body: {
          url,
          paymentProvider: 'worldpay'
        }
      }
      await controller(req, res)

      sinon.assert.calledWith(hpagentMock.HttpsProxyAgent, sinon.match({
        proxy: 'https://fakeproxy.com',
        cert: sinon.match(cert => cert.includes(worldpayCertificate)),
        key: sinon.match(key => key.includes(worldpayKey))
      }))

      sinon.assert.calledWith(axiosCreateStub, sinon.match({
        httpsAgent: sinon.match.any,
        proxy: false
      }))

      sinon.assert.calledWith(axiosPostStub,
        sinon.match(url),
        sinon.match({
          merchantIdentifier: worldpayMerchantId,
          displayName: 'GOV.UK Pay',
          initiative: 'web',
          initiativeContext: merchantDomain
        }),
        sinon.match({
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        })
      )

      sinon.assert.calledWith(res.status, 200)
      sinon.assert.calledWith(sendSpy, appleResponse.data)
    })

    it('should return a payload for a Stripe payment if Merchant is valid', async () => {
      const axiosPostStub = sinon.stub().resolves({ data: appleResponse.data, status: 200 })
      const axiosCreateStub = sinon.stub().returns({ post: axiosPostStub })
      const axiosStub = {
        create: axiosCreateStub
      }
      const controller = getControllerWithMocks(axiosStub)

      const req = {
        body: {
          url,
          paymentProvider: 'stripe'
        }
      }
      await controller(req, res)

      sinon.assert.calledWith(hpagentMock.HttpsProxyAgent, sinon.match({
        proxy: 'https://fakeproxy.com',
        cert: sinon.match(cert => cert.includes(stripeCertificate)),
        key: sinon.match(key => key.includes(stripeKey))
      }))

      sinon.assert.calledWith(axiosCreateStub, sinon.match({
        httpsAgent: sinon.match.any,
        proxy: false
      }))

      sinon.assert.calledWith(axiosPostStub,
        sinon.match(url),
        sinon.match({
          merchantIdentifier: stripeMerchantId,
          displayName: 'GOV.UK Pay',
          initiative: 'web',
          initiativeContext: merchantDomain
        }),
        sinon.match({
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        })
      )

      sinon.assert.calledWith(res.status, 200)
      sinon.assert.calledWith(sendSpy, appleResponse.data)
    })

    it('should return a payload for a Sandbox payment if Merchant is valid', async () => {
      const axiosPostStub = sinon.stub().resolves(appleResponse)
      const axiosCreateStub = sinon.stub().returns({ post: axiosPostStub })
      const axiosStub = {
        create: axiosCreateStub
      }
      const controller = getControllerWithMocks(axiosStub)

      const req = {
        body: {
          url,
          paymentProvider: 'sandbox'
        }
      }

      await controller(req, res)

      sinon.assert.calledWith(hpagentMock.HttpsProxyAgent, sinon.match({
        proxy: 'https://fakeproxy.com',
        cert: sinon.match(cert => cert.includes(worldpayCertificate)),
        key: sinon.match(key => key.includes(worldpayKey))
      }))

      sinon.assert.calledWith(axiosCreateStub, sinon.match({
        httpsAgent: sinon.match.any,
        proxy: false
      }))

      sinon.assert.calledWith(axiosPostStub,
        sinon.match(url),
        sinon.match({
          merchantIdentifier: worldpayMerchantId,
          displayName: 'GOV.UK Pay',
          initiative: 'web',
          initiativeContext: merchantDomain
        }),
        sinon.match({
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        })
      )

      sinon.assert.calledWith(res.status, 200)
      sinon.assert.calledWith(sendSpy, appleResponse.data)
    })
  })

  it('should return 400 if no url is provided', async () => {
    const axiosStub = sinon.stub().resolves({ data: appleResponse.data, status: 200 })
    const controller = getControllerWithMocks(axiosStub)

    const req = {
      body: {
        paymentProvider: 'worldpay'
      }
    }
    await controller(req, res)
    sinon.assert.calledWith(res.sendStatus, 400)
    sinon.assert.notCalled(axiosStub)
  })

  it('should return 400 for unexpected payment provider', async () => {
    const axiosStub = sinon.stub().resolves({ data: appleResponse.data, status: 200 })
    const controller = getControllerWithMocks(axiosStub)

    const req = {
      body: {
        url,
        paymentProvider: 'mystery'
      }
    }
    await controller(req, res)
    sinon.assert.calledWith(res.sendStatus, 400)
    sinon.assert.notCalled(axiosStub)
  })

  it('should return an error if Apple Pay returns an error', async () => {
    const axiosPostStub = sinon.stub().rejects(new Error('Whatever error from Apple Pay'))
    const axiosCreateStub = sinon.stub().returns({ post: axiosPostStub })
    const axiosStub = {
      create: axiosCreateStub
    }
    const controller = getControllerWithMocks(axiosStub)

    const req = {
      body: {
        url,
        paymentProvider: 'worldpay'
      }
    }
    await controller(req, res)
    sinon.assert.calledWith(res.status, 500)
    sinon.assert.calledWith(sendSpy, 'Apple Pay Error')
  })
})
