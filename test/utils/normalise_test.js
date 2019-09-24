var expect = require('chai').expect
var path = require('path')
var _ = require('lodash')
var normalise = require(path.join(__dirname, '/../../app/services/normalise_charge.js'))

var unNormalisedCharge = {
  amount: 1234,
  return_url: 'foo',
  description: 'bar',
  links: [{
    rel: 'rar',
    href: 'http://foo'
  }],
  status: 'status',
  email: 'bobbybobby@bobby.bob',
  auth_3ds_data: {
    paRequest: 'paRequest',
    issuerUrl: 'issuerUrl',
    htmlOut: 'html',
    md: 'md',
    worldpayChallengeJwt: 'worldpayChallengeJwt'
  },
  gateway_account: {
    analytics_id: 'bla-1234',
    type: 'live',
    payment_provider: 'worldpay',
    service_name: 'Pranks incorporated',
    card_types: [{
      type: 'CREDIT',
      brand: 'VISA',
      label: 'Visa'
    }]
  }
}

var normalisedCharge = {
  id: 1,
  amount: '12.34',
  service_return_url: 'foo',
  description: 'bar',
  links: [{
    rel: 'rar',
    href: 'http://foo'
  }],
  status: 'status',
  email: 'bobbybobby@bobby.bob',
  auth3dsData: {
    paRequest: 'paRequest',
    issuerUrl: 'issuerUrl',
    htmlOut: 'html',
    md: 'md',
    worldpayChallengeJwt: 'worldpayChallengeJwt'
  },
  gatewayAccount: {
    analyticsId: 'bla-1234',
    type: 'live',
    paymentProvider: 'worldpay',
    serviceName: 'Pranks incorporated',
    cardTypes: [{
      brand: 'VISA',
      debit: false,
      credit: true
    }]
  }
}

var unNormalisedAddress = {
  addressLine1: 'a',
  addressLine2: 'b',
  addressCity: 'c',
  addressPostcode: 'd',
  addressCountry: 'GB'
}

var normalisedApiAddress = {
  line1: 'a',
  line2: 'b',
  city: 'c',
  postcode: 'd',
  country: 'GB'
}

describe('normalise', function () {
  describe('charge', function () {
    it('should return a refined state', function () {
      var result = normalise.charge(unNormalisedCharge, 1)
      expect(result).to.deep.equal(normalisedCharge)
    })
  })

  describe('api address', function () {
    it('should return a refined address for the api', function () {
      var result = normalise.addressForApi(unNormalisedAddress)
      expect(result).to.deep.equal(normalisedApiAddress)
    })
  })

  describe('addresslines', function () {
    it('should return the body with adressline 2 moved to address line 1 if filled', function () {
      var passedByReference = { addressLine2: 'foo' }
      normalise.addressLines(passedByReference)
      expect(passedByReference).to.deep.equal({ addressLine1: 'foo' })
      expect(passedByReference.addressLine2).to.be.undefined // eslint-disable-line
    })

    it('should do nothing if there is addressLine1', function () {
      var passedByReference = { addressLine1: 'bar', addressLine2: 'foo' }
      normalise.addressLines(passedByReference)
      expect(passedByReference).to.deep.equal({ addressLine1: 'bar', addressLine2: 'foo' })
    })
  })

  describe('whitespace', function () {
    it('should return the body with no surrounding whitespace', function () {
      var passedByReference = {
        email: ' foo@foo.com',
        name: 'Foo Bar ',
        postcode: ' WC2B 6NH '
      }
      normalise.whitespace(passedByReference)
      expect(passedByReference).to.deep.equal({
        email: 'foo@foo.com',
        name: 'Foo Bar',
        postcode: 'WC2B 6NH'
      })
    })

    it('should return the body with no surrounding whitespace but within the email', function () {
      var passedByReference = {
        email: ' fo" "o@foo.com',
        name: 'Foo Bar ',
        postcode: ' WC2B 6NH '
      }
      normalise.whitespace(passedByReference)
      expect(passedByReference).to.deep.equal({
        email: 'fo" "o@foo.com',
        name: 'Foo Bar',
        postcode: 'WC2B 6NH'
      })
    })
  })

  describe('address for view', function () {
    it('should return a comma seperated address', function () {
      var address = normalise.addressForView(unNormalisedAddress)
      expect(address).to.deep.equal('a, b, c, d, United Kingdom')
    })

    it('should return a comma seperated address even with something missing', function () {
      var unNormalised = _.cloneDeep(unNormalisedAddress)
      delete unNormalised.addressCity
      var address = normalise.addressForView(unNormalised)
      expect(address).to.deep.equal('a, b, d, United Kingdom')
    })
  })

  describe('credit card', function () {
    it('should return stripping spaces', function () {
      var card = '1234 5678'
      var address = normalise.creditCard(card)
      expect(address).to.deep.equal('12345678')
    })

    it('should return stripping hyphens', function () {
      var card = '1234-5678'
      var address = normalise.creditCard(card)
      expect(address).to.deep.equal('12345678')
    })
  })
})
