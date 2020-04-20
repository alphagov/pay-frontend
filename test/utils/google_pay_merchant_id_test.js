// npm dependencies
const {expect} = require('chai')
const proxyquire = require('proxyquire').noPreserveCache()

const googlePayMerchantId = '123'
const googlePayMerchantId2 = 'abc'
const gatewayAccountForGooglePayMerchantId2 = 'ga4merchantId2'

describe('google pay merchant id test', function () {
  beforeEach(() => {
    process.env.GOOGLE_PAY_MERCHANT_ID = googlePayMerchantId
  })

  describe('return GOOGLE_PAY_MERCHANT_ID', () => {
    it('when GOOGLE_PAY_MERCHANT_ID_2 env var is empty', () => {
      const { getMerchantId } = newGooglePayMerchantIdCalculator()
      expect(getMerchantId(gatewayAccountForGooglePayMerchantId2)).to.equal(googlePayMerchantId)
    })

    it('when GOOGLE_PAY_MERCHANT_ID_2 env var is set but gateway account is irrelevant', () => {
      process.env.GOOGLE_PAY_MERCHANT_ID_2 = googlePayMerchantId2
      const { getMerchantId } = newGooglePayMerchantIdCalculator()
      expect(getMerchantId('irrelevant')).to.equal(googlePayMerchantId)
    })
  })

  describe('should return GOOGLE_PAY_MERCHANT_ID_2', () => {
    it('when GOOGLE_PAY_MERCHANT_ID_2 env var is set and gateway account is relevant', () => {
      process.env.GOOGLE_PAY_MERCHANT_ID_2 = googlePayMerchantId2
      const { getMerchantId } = newGooglePayMerchantIdCalculator()
      expect(getMerchantId(gatewayAccountForGooglePayMerchantId2)).to.equal(googlePayMerchantId2)
    })
  })
})

function newGooglePayMerchantIdCalculator() {
  return proxyquire('../../app/utils/google_pay_merchant_id_selector.js', {
    '../../config/google_merchant_id_to_gateway_account_id': {
      gatewayAccountIdsForGooglePayMerchantId2: [gatewayAccountForGooglePayMerchantId2]
    }
  })
}
