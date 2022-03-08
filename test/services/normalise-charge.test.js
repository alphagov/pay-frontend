var expect = require('chai').expect
var normalise = require('../../app/services/normalise-charge.js')

describe('normalise', function () {
  it('expiry date should return correctly on multiple formats', function () {
    expect(normalise.expiryDate('1', '17')).to.eql('01/17')
    expect(normalise.expiryDate('01', '17')).to.eql('01/17')
    expect(normalise.expiryDate('01', '2017')).to.eql('01/17')
  })

  const card = '4242424242424242'

  const bodyFixture = {
    chargeId: '42mdrsshtsk4chpeoifhlgf4lk',
    cardNo: card,
    expiryMonth: '01',
    expiryYear: '20',
    cardholderName: 'Joe Bloggs',
    cvc: '111',
    addressCountry: 'GB',
    addressLine1: '1 Horse Guards',
    addressCity: 'London',
    addressPostcode: 'E1 8QS'
  }

  it('includes headers in payload', function () {
    const headers = {
      accept: 'application/json',
      'x-request-id': 'unique-id',
      'x-forwarded-for': '127.0.0.1',
      'user-agent': 'Mozilla/5.0',
      'accept-language': 'fr;q=0.9, fr-CH;q=1.0, en;q=0.8, de;q=0.7, *;q=0.5'
    }

    const payload = {
      body: bodyFixture,
      header: headerName => {
        return headers[headerName]
      },
      headers: headers
    }

    expect(normalise.apiPayload(payload, card).accept_language_header).to.eql('fr;q=0.9, fr-CH;q=1.0, en;q=0.8, de;q=0.7, *;q=0.5')
    expect(normalise.apiPayload(payload, card).accept_header).to.eql('application/json')
    expect(normalise.apiPayload(payload, card).user_agent_header).to.eql('Mozilla/5.0')
  })

  it('sets not present headers to undefined', function () {
    const headers = {
      'x-request-id': 'unique-id',
      'x-forwarded-for': '127.0.0.1'
    }
    const card = '4242424242424242'

    const payload = {
      body: bodyFixture,
      header: headerName => {
        return headers[headerName]
      },
      headers: headers
    }

    expect(normalise.apiPayload(payload, card).accept_language_header).to.eql(undefined)
    expect(normalise.apiPayload(payload, card).accept_header).to.eql(undefined)
    expect(normalise.apiPayload(payload, card).user_agent_header).to.eql(undefined)
  })
})
