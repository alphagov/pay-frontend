const expect = require('chai').expect
const normalise = require('../../app/services/normalise-charge.js')
const serviceFixtures = require('../fixtures/service.fixtures')
const Service = require('../../app/models/Service.class')

const service = new Service(serviceFixtures.validServiceResponse())

const unNormalisedCharge = {
  amount: 1234,
  return_url: 'foo',
  description: 'bar',
  payment_provider: 'worldpay',
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
    service_name: 'Pranks incorporated',
    card_types: [{
      type: 'CREDIT',
      brand: 'VISA',
      label: 'Visa'
    }]
  },
  moto: false
}

const unNormalisedChargeWithAgreement = {
  amount: 1234,
  return_url: 'foo',
  description: 'bar',
  agreement_id: '12345678901234567890abcdef',
  payment_provider: 'worldpay',
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
    service_name: 'Pranks incorporated',
    card_types: [{
      type: 'CREDIT',
      brand: 'VISA',
      label: 'Visa'
    }]
  },
  moto: false
}

const normalisedCharge = {
  id: 1,
  amount: '12.34',
  service_return_url: 'foo',
  description: 'bar',
  paymentProvider: 'worldpay',
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
    serviceName: 'Pranks incorporated',
    cardTypes: [{
      brand: 'VISA',
      debit: false,
      credit: true
    }]
  },
  moto: false
}

const normalisedChargeWithAgreement = {
  id: 1,
  amount: '12.34',
  service_return_url: 'foo',
  agreementId:'12345678901234567890abcdef',
  description: 'bar',
  paymentProvider: 'worldpay',
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
    serviceName: 'Pranks incorporated',
    cardTypes: [{
      brand: 'VISA',
      debit: false,
      credit: true
    }]
  },
  moto: false
}

const unNormalisedChargeWithCardDetails = {
  ...unNormalisedCharge,
  card_details: {
    last_digits_card_number: '1234',
    first_digits_card_number: '424242',
    cardholder_name: 'Mr Test Man',
    expiry_date: '10/23',
    billing_address: {
      line1: 'House 1',
      line2: '10 A road',
      postcode: 'abcd123',
      city: 'Dublin',
      country: 'IE'
    },
    card_brand: 'Visa',
    card_type: 'credit'
  }
}

const unNormalisedChargeWithCardDetailsWithNoCountry = {
  ...unNormalisedCharge,
  card_details: {
    last_digits_card_number: '1234',
    first_digits_card_number: '424242',
    cardholder_name: 'Mr Test Man',
    expiry_date: '10/23',
    billing_address: {
      line1: 'House 1',
      line2: '10 A road',
      postcode: 'abcd123',
      city: 'Dublin'
    },
    card_brand: 'Visa',
    card_type: 'credit'
  }
}

const unNormalisedChargeWithCardDetailsAndAgreement = {
  ...unNormalisedChargeWithAgreement,
  card_details: {
    last_digits_card_number: '1234',
    first_digits_card_number: '424242',
    cardholder_name: 'Mr Test Man',
    expiry_date: '10/23',
    billing_address: {
      line1: 'House 1',
      line2: '10 A road',
      postcode: 'abcd123',
      city: 'Dublin'
    },
    card_brand: 'Visa',
    card_type: 'credit'
  }
}


const normalisedChargeWithCardDetails = {
  ...normalisedChargeWithAgreement,
  cardDetails: {
    cardNumber: '●●●●●●●●●●●●1234',
    firstDigitsCardNumber: '424242',
    cardholderName: 'Mr Test Man',
    expiryDate: '10/23',
    billingAddress: 'House 1, 10 A road, Dublin, abcd123, Ireland',
    cardBrand: 'Visa',
    cardType: 'credit'
  },
  cardholderName: 'Mr Test Man',
  addressCity: 'Dublin',
  addressLine1: 'House 1',
  addressLine2: '10 A road',
  addressPostcode: 'abcd123',
  countryCode: 'IE'
}

const normalisedChargeWithCardDetailsAndDefaultCountry = {
  ...normalisedCharge,
  cardDetails: {
    cardNumber: '●●●●●●●●●●●●1234',
    firstDigitsCardNumber: '424242',
    cardholderName: 'Mr Test Man',
    expiryDate: '10/23',
    billingAddress: 'House 1, 10 A road, Dublin, abcd123',
    cardBrand: 'Visa',
    cardType: 'credit'
  },
  cardholderName: 'Mr Test Man',
  addressCity: 'Dublin',
  addressLine1: 'House 1',
  addressLine2: '10 A road',
  addressPostcode: 'abcd123',
  countryCode: 'GB'
}

const normalisedChargeWithCardDetailsAndDefaultCountryAndAgreement = {
  ...normalisedCharge,
  cardDetails: {
    cardNumber: '●●●●●●●●●●●●1234',
    firstDigitsCardNumber: '424242',
    cardholderName: 'Mr Test Man',
    expiryDate: '10/23',
    billingAddress: 'House 1, 10 A road, Dublin, abcd123',
    cardBrand: 'Visa',
    cardType: 'credit'
  },
  cardholderName: 'Mr Test Man',
  addressCity: 'Dublin',
  addressLine1: 'House 1',
  addressLine2: '10 A road',
  addressPostcode: 'abcd123',
  countryCode: 'GB'
}

const unNormalisedAddress = {
  addressLine1: 'a',
  addressLine2: 'b',
  addressCity: 'c',
  addressPostcode: 'd',
  addressCountry: 'GB'
}

const normalisedApiAddress = {
  line1: 'a',
  line2: 'b',
  city: 'c',
  postcode: 'd',
  country: 'GB'
}

describe('normalise', () => {
  describe('charge', () => {
    describe('without card details', () => {
      it('should return a refined state with a countryCode', () => {
        const result = normalise.charge(unNormalisedCharge, 1, service)
        expect(result).to.deep.equal(normalisedCharge)
      })
    })

    describe('with card details', () => {
      describe('prefilled card details have billing address country', () => {
        it('should return a refined state with country from prefilled details', () => {
          const result = normalise.charge(unNormalisedChargeWithCardDetails, 1, service)
          expect(result).to.deep.equal(normalisedChargeWithCardDetails)
        })
      })

      describe('prefilled card details have no billing address country', () => {
        it('should return a refined state with countryCode GB', () => {
          const result = normalise.charge(unNormalisedChargeWithCardDetailsWithNoCountry, 1, service)
          expect(result).to.deep.equal(normalisedChargeWithCardDetailsAndDefaultCountry)
        })
      })

      describe('payment has associated agreement', () => {
        it('should return agreement id on the payment screen', () => {
          const result = normalise.charge(unNormalisedChargeWithCardDetailsAndAgreement, 1, service)
          expect(result).to.deep.equal(normalisedChargeWithCardDetailsAndDefaultCountry)
        })
      })

    })
  })

  describe('api address', () => {
    it('should return a refined address for the api', () => {
      const result = normalise.addressForApi(unNormalisedAddress)
      expect(result).to.deep.equal(normalisedApiAddress)
    })
  })

  describe('addresslines', () => {
    it('should return the body with adressline 2 moved to address line 1 if filled', () => {
      const passedByReference = { addressLine2: 'foo' }
      normalise.addressLines(passedByReference)
      expect(passedByReference).to.deep.equal({ addressLine1: 'foo' })
      expect(passedByReference.addressLine2).to.be.undefined // eslint-disable-line
    })

    it('should do nothing if there is addressLine1', () => {
      const passedByReference = { addressLine1: 'bar', addressLine2: 'foo' }
      normalise.addressLines(passedByReference)
      expect(passedByReference).to.deep.equal({ addressLine1: 'bar', addressLine2: 'foo' })
    })
  })

  describe('whitespace', () => {
    it('should return the body with no surrounding whitespace', () => {
      const passedByReference = {
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

    it('should return the body with no surrounding whitespace but within the email', () => {
      const passedByReference = {
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

  describe('credit card', () => {
    it('should return stripping spaces', () => {
      const card = '1234 5678'
      const address = normalise.creditCard(card)
      expect(address).to.deep.equal('12345678')
    })

    it('should return stripping hyphens', () => {
      const card = '1234-5678'
      const address = normalise.creditCard(card)
      expect(address).to.deep.equal('12345678')
    })
  })
})
