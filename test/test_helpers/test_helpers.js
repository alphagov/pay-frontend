const request = require('supertest')
const _ = require('lodash')
const serviceFixtures = require('../fixtures/service_fixtures')
const Service = require('../../app/models/Service.class')
const frontendCardDetailsPath = '/card_details'
const connectorChargePath = '/v1/frontend/charges/'
const adminusersServicePath = '/v1/api/services'
const chaiExpect = require('chai').expect
const csrf = require('csrf')
const nock = require('nock')

const defaultCorrelationId = 'some-unique-id'
const defaultGatewayAccountId = '12345'

function localConnector () {
  return process.env.CONNECTOR_HOST
}

function localAdminusers () {
  return process.env.ADMINUSERS_URL
}

function connectorChargeUrl (chargeId) {
  return localConnector() + connectorChargePath + chargeId
}

function connectorAuthUrl (chargeId) {
  return localConnector() + connectorChargePath + chargeId + '/cards'
}

function connectorCaptureUrl (chargeId) {
  return localConnector() + connectorChargePath + chargeId + '/capture'
}

function connectorRespondsWith (chargeId, charge) {
  var connectorMock = nock(localConnector())
  connectorMock.get(connectorChargePath + chargeId).reply(200, charge)
}

function adminusersRespondsWith (gatewayAccountId, service) {
  var adminusersMock = nock(localAdminusers())
  adminusersMock.get(`${adminusersServicePath}?gatewayAccountId=${gatewayAccountId}`).reply(200, service)
}

function initConnectorUrl () {
  process.env.CONNECTOR_URL = localConnector() + connectorChargePath + '{chargeId}'
}

function cardTypes () {
  return [
    {
      brand: 'visa',
      debit: true,
      credit: true
    },
    {
      brand: 'master-card',
      debit: true,
      credit: true
    },
    {
      brand: 'american-express',
      debit: false,
      credit: true
    },
    {
      brand: 'jcb',
      debit: true,
      credit: true
    },
    {
      brand: 'diners-club',
      debit: true,
      credit: true
    },
    {
      brand: 'discover',
      debit: true,
      credit: true
    }
  ]
}

function rawSuccessfulGetChargeDebitCardOnly (status, returnUrl, chargeId, gatewayAccountId) {
  var charge = rawSuccessfulGetCharge(status, returnUrl, chargeId, gatewayAccountId)
  charge.gateway_account.card_types = [
    {
      'type': 'DEBIT',
      'brand': 'visa',
      'label': 'visa'
    }
  ]
  return charge
}

function rawSuccessfulGetCharge (status, returnUrl, chargeId, gatewayAccountId) {
  var charge = {
    'amount': 2345,
    'description': 'Payment Description',
    'status': status,
    'return_url': returnUrl,
    'email': 'bob@bob.bob',
    'links': [{
      'href': connectorChargeUrl(chargeId),
      'rel': 'self',
      'method': 'POST'
    }, {
      'href': connectorAuthUrl(chargeId),
      'rel': 'cardAuth',
      'method': 'POST'
    }, {
      'href': connectorCaptureUrl(chargeId),
      'rel': 'cardCapture',
      'method': 'POST'
    }],
    'gateway_account': {
      'gateway_account_id': gatewayAccountId || defaultGatewayAccountId,
      'analytics_id': 'test-1234',
      'type': 'test',
      'payment_provider': 'sandbox',
      'service_name': 'Pranks incorporated',
      'card_types': [
        {
          'type': 'DEBIT',
          'brand': 'visa',
          'label': 'visa',
          'id': 'id-0'
        },
        {
          'type': 'DEBIT',
          'brand': 'master-card',
          'label': 'master-card',
          'id': 'id-0'
        },
        {
          'type': 'CREDIT',
          'brand': 'american-express',
          'label': 'american-express',
          'id': 'id-0'
        },
        {
          'type': 'DEBIT',
          'brand': 'jcb',
          'label': 'jcb',
          'id': 'id-0'
        },
        {
          'type': 'DEBIT',
          'brand': 'diners-club',
          'label': 'diners-club',
          'id': 'id-0'
        },
        {
          'type': 'DEBIT',
          'brand': 'discover',
          'label': 'discover',
          'id': 'id-0'
        }
      ]
    }
  }
  if (status === 'AUTHORISATION SUCCESS') {
    charge.card_details = {
      'card_brand': 'Visa',
      'cardholder_name': 'Test User',
      'last_digits_card_number': '1234',
      'expiry_date': '11/99',
      'billing_address': {
        'line1': 'line1',
        'line2': 'line2',
        'city': 'city',
        'postcode': 'postcode',
        'county': 'county',
        'country': 'GB'
      }
    }
  }
  if (status === 'AUTHORISATION 3DS REQUIRED') {
    charge.auth_3ds_data = {
      'paRequest': 'aPaRequest',
      'issuerUrl': 'http://issuerUrl.com'
    }
  }
  return charge
}

module.exports = {

  responseTo: function (app, endpoint) {
    return {
      contains: function (expectedResponse) {
        return function (done) {
          request(app)
            .get(endpoint)
            .set('Accept', 'application/json')
            .expect(200)
            .end(function (err, res) {
              if (err) done(err)
              var response = JSON.parse(res.text)
              Object.keys(expectedResponse).map(function (key) {
                expectedResponse[key].should.equal(response[key])
              })
              done()
            })
        }
      }
    }
  },

  getChargeRequest: function (app, cookieValue, chargeId, query) {
    query = query || ''
    return request(app)
      .get(frontendCardDetailsPath + '/' + chargeId + query)
      .set('Cookie', ['frontend_state=' + cookieValue])
      .set('Accept', 'application/json')
      .set('x-request-id', defaultCorrelationId)
  },

  postChargeRequest (app, cookieValue, data, chargeId, sendCSRF = true, query = '') {
    if (sendCSRF) {
      data.csrfToken = csrf().create(process.env.CSRF_USER_SECRET)
    }
    return request(app)
      .post(frontendCardDetailsPath + '/' + chargeId + query)
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('Cookie', ['frontend_state=' + cookieValue])
      .set('Accept', 'application/json')
      .set('x-request-id', 'some-unique-id')
      .send(data)
  },

  connectorResponseForPutCharge: function (chargeId, statusCode, responseBody, overrideUrl) {
    initConnectorUrl()
    var connectorMock = nock(localConnector())
    var mockPath = connectorChargePath + chargeId + '/status'
    var payload = {'new_status': 'ENTERING CARD DETAILS'}
    connectorMock.put(mockPath, payload).reply(statusCode, responseBody)
  },

  defaultAdminusersResponseForGetService: function (gatewayAccountId) {
    let service = new Service(serviceFixtures.validServiceResponse({gateway_account_ids: [gatewayAccountId]}).getPlain())
    adminusersRespondsWith(gatewayAccountId, service)
  },

  defaultConnectorResponseForGetCharge: function (chargeId, status, gatewayAccountId) {
    initConnectorUrl()
    var returnUrl = 'http://www.example.com/service'
    var rawResponse = rawSuccessfulGetCharge(status, returnUrl, chargeId, gatewayAccountId)
    connectorRespondsWith(chargeId, rawResponse)
  },

  rawSuccessfulGetCharge: rawSuccessfulGetCharge,

  rawSuccessfulGetChargeDebitCardOnly: rawSuccessfulGetChargeDebitCardOnly,

  templateValue: function (res, key, value) {
    var body = JSON.parse(res.text)
    return chaiExpect(_.result(body, key)).to.deep.equal(value)
  },

  templateValueNotUndefined: function (res, key) {
    var body = JSON.parse(res.text)
    return chaiExpect(_.result(body, key)).to.not.be.undefined
  },

  templateValueUndefined: function (res, key) {
    var body = JSON.parse(res.text)
    return chaiExpect(_.result(body, key)).to.be.undefined
  },

  unexpectedPromise: function (data) {
    throw new Error('Promise was unexpectedly fulfilled.')
  },

  csrfToken: function () {
    return csrf().create(process.env.CSRF_USER_SECRET)
  },

  cardTypes: cardTypes

}
