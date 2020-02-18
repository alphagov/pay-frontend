'use strict'

// Core dependencies
const path = require('path')

// Local dependencies
const paymentFixtures = require('../fixtures/payment_fixtures')

// NPM dependencies
const proxyquire = require('proxyquire')
const sinon = require('sinon')
const expect = require('chai').expect

const chargeId = '42mdrsshtsk4chpeoifhlgf4lk'
const card = paymentFixtures.validCardDetails()
const chargeData = paymentFixtures.validChargeDetails({ emailCollectionMode: 'OFF' }).getPlain()

const paymentDetailsWithoutAddress = {
  chargeId: chargeId,
  cardNo: '4242424242424242',
  expiryMonth: '01',
  expiryYear: '20',
  cardholderName: 'Joe Bloggs',
  cvc: '111'
}

const paymentDetails = {
  ...paymentDetailsWithoutAddress,
  addressCountry: 'GB',
  addressLine1: '1 Horse Guards',
  addressCity: 'London',
  addressPostcode: 'E1 8QS'
}

describe('with valid payment details', function () {
  describe('POST /card_details/{chargeId} endpoint', function () {
    let response
    let chargeAuthStub
    let mockedConnectorClient

    beforeEach(() => {
      chargeAuthStub = sinon.stub().resolves(
        {
          statusCode: 200,
          body: {
            status: 'AUTHORISATION SUCCESS'
          }
        })
      mockedConnectorClient = sinon.stub().callsFake(() => {
        return {
          chargeAuth: chargeAuthStub
        }
      })
      response = {
        redirect: sinon.spy(),
        locals: {
          collectBillingAddress: true
        }
      }
    })

    it('should send worldpay_3ds_flex_ddc_result to connector when the request includes a worldpay3dsFlexDdcResult parameter', async function () {
      paymentDetails.worldpay3dsFlexDdcResult = 'a-worldpay-3ds-flex-ddc-result'
      const request = {
        chargeData: chargeData,
        body: paymentDetails,
        chargeId: chargeId,
        header: sinon.spy(),
        headers: {
          'x-request-id': 'unique-id',
          'x-forwarded-for': '127.0.0.1'
        }
      }

      await requireChargeController(mockedConnectorClient).create(request, response)

      const payload = paymentFixtures.validAuthorisationRequest({
        cardNumber: paymentDetails.cardNo,
        cvc: paymentDetails.cvc,
        cardBrand: card.brand,
        expiryDate: `${paymentDetails.expiryMonth}/${paymentDetails.expiryYear}`,
        cardholderName: paymentDetails.cardholderName,
        cardType: card.type,
        corporateCard: card.corporate,
        prepaid: card.prepaid,
        addressLine1: paymentDetails.addressLine1,
        addressCity: paymentDetails.addressCity,
        addressPostcode: paymentDetails.addressPostcode,
        addressCountry: paymentDetails.addressCountry,
        worldpay3dsFlexDdcResult: paymentDetails.worldpay3dsFlexDdcResult
      }).getPlain()

      delete payload.accept_header
      delete payload.user_agent_header

      expect(chargeAuthStub.calledWith(sinon.match( // eslint-disable-line
        {
          chargeId: chargeId,
          payload: payload
        }
      ))).to.be.true // eslint-disable-line
    })

    it('should not send worldpay_3ds_flex_ddc_result to connector when the request does not include a worldpay3dsFlexDdcResult parameter', async function () {
      const request = {
        chargeData: chargeData,
        body: paymentDetails,
        chargeId: chargeId,
        header: sinon.spy(),
        headers: {
          'x-request-id': 'unique-id',
          'x-forwarded-for': '127.0.0.1'
        }
      }
      await requireChargeController(mockedConnectorClient).create(request, response)

      const payload = paymentFixtures.validAuthorisationRequest({
        cardNumber: paymentDetails.cardNo,
        cvc: paymentDetails.cvc,
        cardBrand: card.brand,
        expiryDate: `${paymentDetails.expiryMonth}/${paymentDetails.expiryYear}`,
        cardholderName: paymentDetails.cardholderName,
        cardType: card.type,
        corporateCard: card.corporate,
        prepaid: card.prepaid,
        addressLine1: paymentDetails.addressLine1,
        addressCity: paymentDetails.addressCity,
        addressPostcode: paymentDetails.addressPostcode,
        addressCountry: paymentDetails.addressCountry
      }).getPlain()

      delete payload.accept_header
      delete payload.user_agent_header

      expect(chargeAuthStub.calledWith(sinon.match( // eslint-disable-line
        {
          chargeId: chargeId,
          payload: payload
        }
      ))).to.be.true // eslint-disable-line
    })

    it('should not include billing address in authorisation request when billing address collection disabled', async function () {
      response.locals.collectBillingAddress = false

      const request = {
        chargeData: chargeData,
        body: paymentDetailsWithoutAddress,
        chargeId: chargeId,
        header: sinon.spy(),
        headers: {
          'x-request-id': 'unique-id',
          'x-forwarded-for': '127.0.0.1'
        }
      }
      await requireChargeController(mockedConnectorClient).create(request, response)

      const payload = paymentFixtures.validAuthorisationRequest({
        cardNumber: paymentDetailsWithoutAddress.cardNo,
        cvc: paymentDetailsWithoutAddress.cvc,
        cardBrand: card.brand,
        expiryDate: `${paymentDetailsWithoutAddress.expiryMonth}/${paymentDetailsWithoutAddress.expiryYear}`,
        cardholderName: paymentDetailsWithoutAddress.cardholderName,
        cardType: card.type,
        corporateCard: card.corporate,
        prepaid: card.prepaid,
        noBillingAddress: true
      }).getPlain()

      delete payload.accept_header
      delete payload.user_agent_header

      expect(chargeAuthStub.calledWith(sinon.match( // eslint-disable-line
        {
          chargeId: chargeId,
          payload: payload
        }
      ))).to.be.true // eslint-disable-line
    })
  })
})

describe('with invalid payment details', function () {
  describe('when DECRYPT_AND_OMIT_CARD_DATA is set', function () {
    let chargeController
    beforeEach(() => {
      chargeController = requireChargeController(sinon.stub(), { failValidation: true, decryptAndOmitCardData: true })
    })

    describe('POST /card_details/{chargeId} endpoint', function () {
      it('should show a validation error including card data', async function () {
        const request = {
          chargeData: chargeData,
          body: paymentDetails,
          chargeId: chargeId,
          header: sinon.stub(),
          headers: {
            'x-request-id': 'unique-id',
            'x-forwarded-for': '127.0.0.1'
          }
        }
        const response = {
          redirect: sinon.spy(),
          status: sinon.spy(),
          render: sinon.spy(),
          locals: {
            collectBillingAddress: true
          }
        }

        await chargeController.create(request, response)

        expect(response.status.getCall(0).args[0]).to.equal(200)
        const [renderedView, renderParameters] = response.render.getCall(0).args
        expect(renderedView).to.equal('charge')
        const renderKeys = Object.keys(renderParameters)
        expect(renderKeys).not.to.include('cardNo')
        expect(renderKeys).not.to.include('expiryMonth')
        expect(renderKeys).not.to.include('expiryYear')
        expect(renderKeys).not.to.include('cvc')
      })
    })
  })

  describe('when DECRYPT_AND_OMIT_CARD_DATA is not set', function () {
    let chargeController
    beforeEach(() => {
      chargeController = requireChargeController(sinon.stub(), { failValidation: true, decryptAndOmitCardData: undefined })
    })
    describe('POST /card_details/{chargeId} endpoint', function () {
      it('should show a validation error including card data', async function () {
        const request = {
          chargeData: chargeData,
          body: paymentDetails,
          chargeId: chargeId,
          header: sinon.spy(),
          headers: {
            'x-request-id': 'unique-id',
            'x-forwarded-for': '127.0.0.1'
          }
        }
        const response = {
          redirect: sinon.spy(),
          status: sinon.spy(),
          render: sinon.spy(),
          locals: {
            collectBillingAddress: true
          }
        }

        await chargeController.create(request, response)

        expect(response.status.getCall(0).args[0]).to.equal(200)
        const [renderedView, renderParameters] = response.render.getCall(0).args
        expect(renderedView).to.equal('charge')
        expect(renderParameters).to.include({
          cardNo: paymentDetails.cardNo,
          expiryMonth: paymentDetails.expiryMonth,
          expiryYear: paymentDetails.expiryYear,
          cvc: paymentDetails.cvc
        })
      })
    })
  })
})

function requireChargeController (mockedConnectorClient, { failValidation, decryptAndOmitCardData } = {}) {
  const mockedChargeValidationBackend = () => ({
    verify: () => Promise.resolve({ validation: { hasError: failValidation }, card })
  })

  const proxyquireMocks = {
    '../utils/charge_validation_backend': mockedChargeValidationBackend,
    '../services/clients/connector_client': mockedConnectorClient
  }
  const oldDecryptAndOmitCardData = process.env.DECRYPT_AND_OMIT_CARD_DATA
  if (decryptAndOmitCardData) {
    process.env.DECRYPT_AND_OMIT_CARD_DATA = decryptAndOmitCardData
  }
  const result = proxyquire(path.join(__dirname, '/../../app/controllers/charge_controller.js'), proxyquireMocks)
  if (oldDecryptAndOmitCardData) {
    process.env.DECRYPT_AND_OMIT_CARD_DATA = oldDecryptAndOmitCardData
  } else {
    delete process.env.DECRYPT_AND_OMIT_CARD_DATA
  }
  return result
}
