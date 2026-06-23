const expect = require('chai').expect
const normalise = require('../../app/services/normalise-charge.js')

describe('normalise', function () {
  it('expiry date should return correctly on multiple formats', function () {
    expect(normalise.expiryDate('1', '17')).to.eql('01/17')
    expect(normalise.expiryDate('01', '17')).to.eql('01/17')
    expect(normalise.expiryDate('01', '2017')).to.eql('01/17')
  })

  it('includes headers in payload', function () {
    const bodyFixture = getRequestBodyWithMinimumDetails()
    const headers = {
      accept: 'application/json',
      'x-request-id': 'unique-id',
      'x-forwarded-for': '127.0.0.1',
      'user-agent': 'Mozilla/5.0',
      'accept-language': 'fr;q=0.9, fr-CH;q=1.0, en;q=0.8, de;q=0.7, *;q=0.5'
    }

    const payload = buildRequest(bodyFixture, headers)

    expect(normalise.apiPayload(payload, {}).accept_language_header).to.eql('fr;q=0.9, fr-CH;q=1.0, en;q=0.8, de;q=0.7, *;q=0.5')
    expect(normalise.apiPayload(payload, {}).accept_header).to.eql('application/json')
    expect(normalise.apiPayload(payload, {}).user_agent_header).to.eql('Mozilla/5.0')
  })

  it('sets not present headers to undefined', function () {
    const bodyFixture = getRequestBodyWithMinimumDetails()
    const headers = {
      'x-request-id': 'unique-id',
      'x-forwarded-for': '127.0.0.1'
    }
    const payload = buildRequest(bodyFixture, headers)

    expect(normalise.apiPayload(payload, {}).accept_language_header).to.eql(undefined)
    expect(normalise.apiPayload(payload, {}).accept_header).to.eql(undefined)
    expect(normalise.apiPayload(payload, {}).user_agent_header).to.eql(undefined)
  })

  describe('browser info', function () {
    it('should include all additional browser info', () => {
      const bodyFixture = getRequestBodyWithMinimumDetails()
      bodyFixture.jsEnabled = 'true'
      bodyFixture.jsScreenHeight = '900'
      bodyFixture.jsScreenWidth = '1440'
      bodyFixture.jsScreenColorDepth = '24'
      bodyFixture.jsNavigatorLanguage = 'en-GB'
      bodyFixture.jsTimezoneOffsetMins = '-60'

      const payload = buildRequest(bodyFixture, {})

      const normalisedPayload = normalise.apiPayload(payload, {})
      expect(normalisedPayload.js_enabled).to.eql('true')
      expect(normalisedPayload.js_screen_height).to.eql('900')
      expect(normalisedPayload.js_screen_width).to.eql('1440')
      expect(normalisedPayload.js_screen_color_depth).to.eql('24')
      expect(normalisedPayload.js_navigator_language).to.eql('en-GB')
      expect(normalisedPayload.js_timezone_offset_mins).to.eql('-60')
    })

    it('should NOT include additional browser info, if not available', () => {
      const bodyFixture = getRequestBodyWithMinimumDetails()

      const payload = buildRequest(bodyFixture, {})

      const normalisedPayload = normalise.apiPayload(payload, {})
      expect(normalisedPayload.js_enabled).to.eql(undefined)
      expect(normalisedPayload.js_screen_height).to.eql(undefined)
      expect(normalisedPayload.js_screen_width).to.eql(undefined)
      expect(normalisedPayload.js_screen_color_depth).to.eql(undefined)
      expect(normalisedPayload.js_navigator_language).to.eql(undefined)
      expect(normalisedPayload.js_timezone_offset_mins).to.eql(undefined)
    })
  })
})

function getRequestBodyWithMinimumDetails () {
  return {
    chargeId: '42mdrsshtsk4chpeoifhlgf4lk',
    cardNo: '4242424242424242',
    expiryMonth: '01',
    expiryYear: '20',
    cardholderName: 'Joe Bloggs',
    cvc: '111',
    addressCountry: 'GB',
    addressLine1: '1 Horse Guards',
    addressCity: 'London',
    addressPostcode: 'E1 8QS'
  }
}

function buildRequest (bodyFixture, headers) {
  return {
    body: bodyFixture,
    header: headerName => {
      return headers[headerName]
    },
    headers: headers
  }
}
