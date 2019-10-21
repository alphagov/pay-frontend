'use strict'

// NPM dependencies
const nock = require('nock')
const chai = require('chai')
const cheerio = require('cheerio')
const expect = chai.expect
const proxyquire = require('proxyquire')
const AWSXRay = require('aws-xray-sdk')

// Local dependencies
const logger = require('../../app/utils/logger')(__filename)
const paymentFixtures = require('../fixtures/payment_fixtures')

const app = proxyquire('../../server.js', {
  'aws-xray-sdk': {
    enableManualMode: () => { },
    setLogger: () => { },
    middleware: {
      setSamplingRules: () => { }
    },
    config: () => { },
    express: {
      openSegment: () => (req, res, next) => next(),
      closeSegment: () => (req, rest, next) => next()
    },
    captureAsyncFunc: (name, callback) => callback(new AWSXRay.Segment('stub-subsegment')),
    '@global': true
  },
  'continuation-local-storage': {
    getNamespace: function () {
      return {
        get: () => new AWSXRay.Segment('stub-segment'),
        bindEmitter: () => { },
        run: callback => callback(),
        set: () => { }
      }
    },
    '@global': true
  }
}).getApp()
const cookie = require('../test_helpers/session.js')
const { getChargeRequest, postChargeRequest } = require('../test_helpers/test_helpers.js')
const { defaultAdminusersResponseForGetService } = require('../test_helpers/test_helpers.js')
const State = require('../../config/state.js')

// Constants
const connectorChargePath = '/v1/frontend/charges/'
const chargeId = '23144323'
const frontendCardDetailsPath = '/card_details'
const gatewayAccountId = '12345'

const chargeOptionsWith3dsRequired = {
  status: State.AUTH_3DS_REQUIRED,
  chargeId,
  gatewayAccountId
}

describe('chargeTests', function () {
  beforeEach(function () {
    nock.cleanAll()
  })

  before(function () {
    // Disable logging.
    logger.level = 'none'
  })

  describe('The /card_details/charge_id/3ds_required', function () {
    describe('When invoked on a worldpay gateway account', function () {
      it('should return the data needed for the iframe UI', function (done) {
        const paRequest = 'aPaRequest'
        const issuerUrl = 'http://issuerUrl.test'
        const chargeResponse = paymentFixtures.validChargeDetails({
          ...chargeOptionsWith3dsRequired,
          auth3dsData: {
            paRequest,
            issuerUrl
          }
        }).getPlain()

        defaultAdminusersResponseForGetService(gatewayAccountId)

        nock(process.env.CONNECTOR_HOST)
          .get('/v1/frontend/charges/' + chargeId).reply(200, chargeResponse)
        const cookieValue = cookie.create(chargeId)

        getChargeRequest(app, cookieValue, chargeId, '/3ds_required_out')
          .expect(200)
          .expect(function (res) {
            const $ = cheerio.load(res.text)
            expect($('form[name=\'three_ds_required\'] > input[name=\'PaReq\']').attr('value')).to.eql(paRequest)
            expect($('form[name=\'three_ds_required\']').attr('action')).to.eql(issuerUrl)
          })
          .end(done)
      })
    })
    describe('When invoked on a worldpay gateway account using 3DS Flex', function () {
      it('should return the data needed for the iframe UI for a test gateway account', function (done) {
        const worldpayChallengeJwt = 'aChallengeJwt'
        const chargeResponse = paymentFixtures.validChargeDetails({
          ...chargeOptionsWith3dsRequired,
          auth3dsData: {
            worldpayChallengeJwt
          },
          gatewayAccountType: 'test'
        }).getPlain()

        defaultAdminusersResponseForGetService(gatewayAccountId)

        nock(process.env.CONNECTOR_HOST)
          .get('/v1/frontend/charges/' + chargeId).reply(200, chargeResponse)
        const cookieValue = cookie.create(chargeId)

        getChargeRequest(app, cookieValue, chargeId, '/3ds_required_out')
          .expect(200)
          .expect(function (res) {
            const $ = cheerio.load(res.text)
            expect($('form[name=\'three_ds_required\'] > input[name=\'JWT\']').attr('value')).to.eql(worldpayChallengeJwt)
            expect($('form[name=\'three_ds_required\']').attr('action')).to.eql(process.env.WORLDPAY_3DS_FLEX_CHALLENGE_TEST_URL)
          })
          .end(done)
      })
      it('should return the data needed for the iframe UI for a live gateway account', function (done) {
        const worldpayChallengeJwt = 'aChallengeJwt'
        const chargeResponse = paymentFixtures.validChargeDetails({
          ...chargeOptionsWith3dsRequired,
          auth3dsData: {
            worldpayChallengeJwt
          },
          gatewayAccountType: 'live'
        }).getPlain()
        defaultAdminusersResponseForGetService(gatewayAccountId)

        nock(process.env.CONNECTOR_HOST)
          .get('/v1/frontend/charges/' + chargeId).reply(200, chargeResponse)
        const cookieValue = cookie.create(chargeId)

        getChargeRequest(app, cookieValue, chargeId, '/3ds_required_out')
          .expect(200)
          .expect(function (res) {
            const $ = cheerio.load(res.text)
            expect($('form[name=\'three_ds_required\'] > input[name=\'JWT\']').attr('value')).to.eql(worldpayChallengeJwt)
            expect($('form[name=\'three_ds_required\']').attr('action')).to.eql(process.env.WORLDPAY_3DS_FLEX_CHALLENGE_LIVE_URL)
          })
          .end(done)
      })
    })
    describe('When invoked on a smartpay gateway account', function () {
      it('should return the data needed for the iframe UI', function (done) {
        const paRequest = 'aPaRequest'
        const md = 'mdValue'
        const issuerUrl = 'http://issuerUrl.test'
        const chargeResponse = paymentFixtures.validChargeDetails({
          ...chargeOptionsWith3dsRequired,
          auth3dsData: {
            paRequest,
            md,
            issuerUrl
          }
        }).getPlain()

        defaultAdminusersResponseForGetService(gatewayAccountId)

        nock(process.env.CONNECTOR_HOST)
          .get('/v1/frontend/charges/' + chargeId).reply(200, chargeResponse)
        const cookieValue = cookie.create(chargeId)

        getChargeRequest(app, cookieValue, chargeId, '/3ds_required_out')
          .expect(200)
          .expect(function (res) {
            const $ = cheerio.load(res.text)
            expect($('form[name=\'three_ds_required\'] > input[name=\'PaReq\']').attr('value')).to.eql('aPaRequest')
            expect($('form[name=\'three_ds_required\'] > input[name=\'MD\']').attr('value')).to.eql('mdValue')
            expect($('form[name=\'three_ds_required\']').attr('action')).to.eql('http://issuerUrl.test')
          })
          .end(done)
      })
    })
    describe('When invoked on a stripe gateway account', function () {
      it('should redirect to the issuer URL', function (done) {
        const issuerUrl = 'http://issuerUrl.test'
        const chargeResponse = paymentFixtures.validChargeDetails({
          ...chargeOptionsWith3dsRequired,
          auth3dsData: {
            issuerUrl
          }
        }).getPlain()
        defaultAdminusersResponseForGetService(gatewayAccountId)

        nock(process.env.CONNECTOR_HOST)
          .get('/v1/frontend/charges/' + chargeId).reply(200, chargeResponse)
        const cookieValue = cookie.create(chargeId)

        getChargeRequest(app, cookieValue, chargeId, '/3ds_required_out')
          .expect(303)
          .expect(function (res) {
            expect(res.headers.location).to.eql(issuerUrl)
          })
          .end(done)
      })
    })

    describe('When invoked on an epdq gateway account', function () {
      it('should return the data needed for the iframe UI', function (done) {
        const htmlOut = Buffer.from('<form> epdq data </form>').toString('base64')
        const chargeResponse = paymentFixtures.validChargeDetails({
          ...chargeOptionsWith3dsRequired,
          auth3dsData: {
            htmlOut
          }
        }).getPlain()
        defaultAdminusersResponseForGetService(gatewayAccountId)

        nock(process.env.CONNECTOR_HOST)
          .get('/v1/frontend/charges/' + chargeId).reply(200, chargeResponse)
        const cookieValue = cookie.create(chargeId)

        getChargeRequest(app, cookieValue, chargeId, '/3ds_required_out')
          .expect(200)
          .expect(function (res) {
            const $ = cheerio.load(res.text)
            expect($.html()).to.include('<form> epdq data </form>')
          })
          .end(done)
      })
    })

    describe('When required information not found for auth 3ds out view', function () {
      it('should display error in iframe UI', function (done) {
        const chargeResponse = paymentFixtures.validChargeDetails(chargeOptionsWith3dsRequired).getPlain()
        defaultAdminusersResponseForGetService(gatewayAccountId)

        nock(process.env.CONNECTOR_HOST)
          .get('/v1/frontend/charges/' + chargeId).reply(200, chargeResponse)
        const cookieValue = cookie.create(chargeId)

        getChargeRequest(app, cookieValue, chargeId, '/3ds_required_out')
          .expect(500)
          .expect(function (res) {
            const $ = cheerio.load(res.text)
            expect($('title').text()).to.include('An error occurred')
          })
          .end(done)
      })
    })
  })

  describe('The /card_details/charge_id/3ds_required_in', function () {
    describe('for worldpay payment provider', function () {
      it('should return the data needed for the UI', function (done) {
        const chargeResponse = paymentFixtures.validChargeDetails(chargeOptionsWith3dsRequired).getPlain()
        defaultAdminusersResponseForGetService(gatewayAccountId)

        nock(process.env.CONNECTOR_HOST)
          .get('/v1/frontend/charges/' + chargeId).reply(200, chargeResponse)
        const cookieValue = cookie.create(chargeId)
        const data = {
          PaRes: 'aPaRes',
          MD: 'aMD'
        }
        postChargeRequest(app, cookieValue, data, chargeId, false, '/3ds_required_in')
          .expect(200)
          .expect(function (res) {
            const $ = cheerio.load(res.text)
            expect($('form[name=\'three_ds_required\'] > input[name=\'PaRes\']').attr('value')).to.eql('aPaRes')
            expect($('form[name=\'three_ds_required\'] > input[name=\'MD\']').attr('value')).to.eql('aMD')
            expect($('form[name=\'three_ds_required\']').attr('action')).to.eql(`/card_details/${chargeId}/3ds_handler`)
          })
          .end(done)
      })

      it('should not return UI elements for which there is no data', function (done) {
        const chargeResponse = paymentFixtures.validChargeDetails(chargeOptionsWith3dsRequired).getPlain()
        defaultAdminusersResponseForGetService(gatewayAccountId)

        nock(process.env.CONNECTOR_HOST)
          .get('/v1/frontend/charges/' + chargeId).reply(200, chargeResponse)
        const cookieValue = cookie.create(chargeId)
        const data = {
        }
        postChargeRequest(app, cookieValue, data, chargeId, false, '/3ds_required_in')
          .expect(200)
          .expect(function (res) {
            const $ = cheerio.load(res.text)
            expect($('form[name=\'three_ds_required\'] > input[name=\'PaRes\']').length).to.equal(0)
            expect($('form[name=\'three_ds_required\'] > input[name=\'MD\']').length).to.equal(0)
          })
          .end(done)
      })
    })

    describe('for epdq payment provider', function () {
      it('should return the data needed for the UI when POST', function (done) {
        const chargeResponse = paymentFixtures.validChargeDetails({
          ...chargeOptionsWith3dsRequired,
          paymentProvider: 'epdq'
        }).getPlain()
        defaultAdminusersResponseForGetService(gatewayAccountId)

        nock(process.env.CONNECTOR_HOST)
          .get('/v1/frontend/charges/' + chargeId).reply(200, chargeResponse)
        const cookieValue = cookie.create(chargeId)
        const data = {}
        postChargeRequest(app, cookieValue, data, chargeId, false, '/3ds_required_in/epdq')
          .expect(200)
          .expect(function (res) {
            const $ = cheerio.load(res.text)
            expect($('form[name=\'three_ds_required\'] > input[name=\'providerStatus\']').attr('value')).to.eql('success')
            expect($('form[name=\'three_ds_required\']').attr('action')).to.eql(`/card_details/${chargeId}/3ds_handler`)
          })
          .end(done)
      })

      it('should return the data needed for the UI when GET', function (done) {
        const chargeResponse = paymentFixtures.validChargeDetails({
          ...chargeOptionsWith3dsRequired,
          paymentProvider: 'epdq'
        }).getPlain()
        defaultAdminusersResponseForGetService(gatewayAccountId)

        nock(process.env.CONNECTOR_HOST)
          .get('/v1/frontend/charges/' + chargeId).reply(200, chargeResponse)
        const cookieValue = cookie.create(chargeId)
        getChargeRequest(app, cookieValue, chargeId, '/3ds_required_in/epdq?status=declined')
          .expect(200)
          .expect(function (res) {
            const $ = cheerio.load(res.text)
            expect($('form[name=\'three_ds_required\'] > input[name=\'providerStatus\']').attr('value')).to.eql('declined')
            expect($('form[name=\'three_ds_required\']').attr('action')).to.eql(`/card_details/${chargeId}/3ds_handler`)
          })
          .end(done)
      })

      it('should return error when POST', function (done) {
        const chargeResponse = paymentFixtures.validChargeDetails({
          ...chargeOptionsWith3dsRequired,
          paymentProvider: 'epdq'
        }).getPlain()
        defaultAdminusersResponseForGetService(gatewayAccountId)

        nock(process.env.CONNECTOR_HOST)
          .get('/v1/frontend/charges/' + chargeId).reply(200, chargeResponse)
        const cookieValue = cookie.create(chargeId)
        const data = {}
        postChargeRequest(app, cookieValue, data, chargeId, false, '/3ds_required_in/epdq?status=error')
          .expect(200)
          .expect(function (res) {
            const $ = cheerio.load(res.text)
            expect($('form[name=\'three_ds_required\'] > input[name=\'providerStatus\']').attr('value')).to.eql('error')
            expect($('form[name=\'three_ds_required\']').attr('action')).to.eql(`/card_details/${chargeId}/3ds_handler`)
          })
          .end(done)
      })
    })

    describe('for smartpay payment provider', function () {
      it('should return the data needed for the UI when GET', function (done) {
        const chargeResponse = paymentFixtures.validChargeDetails(chargeOptionsWith3dsRequired).getPlain()
        defaultAdminusersResponseForGetService(gatewayAccountId)

        nock(process.env.CONNECTOR_HOST)
          .get('/v1/frontend/charges/' + chargeId).reply(200, chargeResponse)
        const cookieValue = cookie.create(chargeId)
        const data = {
          PaRes: 'aPaRes',
          MD: 'md'
        }
        postChargeRequest(app, cookieValue, data, chargeId, false, '/3ds_required_in')
          .expect(200)
          .expect(function (res) {
            const $ = cheerio.load(res.text)
            expect($('form[name=\'three_ds_required\'] > input[name=\'PaRes\']').attr('value')).to.eql('aPaRes')
            expect($('form[name=\'three_ds_required\'] > input[name=\'MD\']').attr('value')).to.eql('md')
            expect($('form[name=\'three_ds_required\']').attr('action')).to.eql(`/card_details/${chargeId}/3ds_handler`)
          })
          .end(done)
      })
    })
  })

  describe('The /card_details/charge_id/3ds_handler', function () {
    const chargeResponse = paymentFixtures.validChargeDetails(chargeOptionsWith3dsRequired).getPlain()

    it('should send 3ds data to connector and redirect to confirm', function (done) {
      const cookieValue = cookie.create(chargeId)
      nock(process.env.CONNECTOR_HOST)
        .get(`/v1/frontend/charges/${chargeId}`).reply(200, chargeResponse)
        .post(`${connectorChargePath}${chargeId}/3ds`, { pa_response: 'aPaResponse' }).reply(200)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      postChargeRequest(app, cookieValue, { PaRes: 'aPaResponse' }, chargeId, true, '/3ds_handler')
        .expect(303)
        .expect('Location', `${frontendCardDetailsPath}/${chargeId}/confirm`)
        .end(done)
    })

    it('should send 3ds data to connector and redirect to auth_waiting if connector returns a 202', function (done) {
      const cookieValue = cookie.create(chargeId)
      nock(process.env.CONNECTOR_HOST)
        .get(`/v1/frontend/charges/${chargeId}`).reply(200, chargeResponse)
        .post(`${connectorChargePath}${chargeId}/3ds`, { pa_response: 'aPaResponse' }).reply(202)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      postChargeRequest(app, cookieValue, { PaRes: 'aPaResponse' }, chargeId, true, '/3ds_handler')
        .expect(303)
        .expect('Location', `${frontendCardDetailsPath}/${chargeId}/auth_waiting`)
        .end(done)
    })

    it('should send 3ds data to connector and redirect to auth_waiting if connector returns a 409', function (done) {
      const cookieValue = cookie.create(chargeId)
      nock(process.env.CONNECTOR_HOST)
        .get(`/v1/frontend/charges/${chargeId}`).reply(200, chargeResponse)
        .post(`${connectorChargePath}${chargeId}/3ds`, { pa_response: 'aPaResponse' }).reply(409)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      postChargeRequest(app, cookieValue, { PaRes: 'aPaResponse' }, chargeId, true, '/3ds_handler')
        .expect(303)
        .expect('Location', `${frontendCardDetailsPath}/${chargeId}/auth_waiting`)
        .end(done)
    })

    it('should redirect to auth_waiting if connector returns a 409 for Stripe when status AUTHORISATION 3DS READY', function (done) {
      const cookieValue = cookie.create(chargeId)
      const stripeChargeResponse = paymentFixtures.validChargeDetails(
        {
          ...chargeOptionsWith3dsRequired,
          paymentProvider: 'stripe'
        }).getPlain()
      nock(process.env.CONNECTOR_HOST)
        .get(`/v1/frontend/charges/${chargeId}`).reply(200, stripeChargeResponse)
        .post(`${connectorChargePath}${chargeId}/3ds`, {}).reply(409)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      postChargeRequest(app, cookieValue, {}, chargeId, true, '/3ds_handler')
        .expect(303)
        .expect('Location', `${frontendCardDetailsPath}/${chargeId}/auth_waiting`)
        .end(done)
    })

    it('should send 3ds data to connector and render an error if connector returns an 500', function (done) {
      const cookieValue = cookie.create(chargeId)
      nock(process.env.CONNECTOR_HOST)
        .get(`/v1/frontend/charges/${chargeId}`).reply(200, chargeResponse)
        .post(`${connectorChargePath}${chargeId}/3ds`, { pa_response: 'aPaResponse' }).reply(500)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      postChargeRequest(app, cookieValue, { PaRes: 'aPaResponse' }, chargeId, true, '/3ds_handler')
        .expect(500)
        .end(done)
    })

    it('should send 3ds data to connector and render an error if connector returns an invalid status code', function (done) {
      const cookieValue = cookie.create(chargeId)
      nock(process.env.CONNECTOR_HOST)
        .get(`/v1/frontend/charges/${chargeId}`).reply(200, chargeResponse)
        .post(`${connectorChargePath}${chargeId}/3ds`, { pa_response: 'aPaResponse' }).reply(404)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      postChargeRequest(app, cookieValue, { PaRes: 'aPaResponse' }, chargeId, true, '/3ds_handler')
        .expect(500)
        .end(done)
    })

    it('should send 3ds data to connector and render an error if connector post failed', function (done) {
      const cookieValue = cookie.create(chargeId)
      nock(process.env.CONNECTOR_HOST)
        .get(`/v1/frontend/charges/${chargeId}`).reply(200, chargeResponse)
        .post(`${connectorChargePath}${chargeId}/3ds`, { pa_response: 'aPaResponse' }).replyWithError(404)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      postChargeRequest(app, cookieValue, { PaRes: 'aPaResponse' }, chargeId, true, '/3ds_handler')
        .expect(500)
        .end(done)
    })
  })
})
