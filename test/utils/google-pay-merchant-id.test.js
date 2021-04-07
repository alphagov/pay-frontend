// npm dependencies
const { expect } = require('chai')
const proxyquire = require('proxyquire').noPreserveCache()

const googlePayMerchantId = 'google_pay_merchant_id'
const googlePayMerchantId2 = 'google_pay_merchant_id_2'
const gatewayAccountIdsForGooglePayMerchantId2 = '4 8 15 16 23 42'
const gatewayAccountIdThatIsInGatewayAccountIdsForGooglePayMerchantId2 = 23

describe('Google Pay merchant ID selector test', function () {
  beforeEach(() => {
    process.env.GOOGLE_PAY_MERCHANT_ID = googlePayMerchantId
  })

  afterEach(() => {
    delete process.env.GOOGLE_PAY_MERCHANT_ID_2
    delete process.env.GATEWAY_ACCOUNT_IDS_FOR_GOOGLE_PAY_MERCHANT_ID_2
  })

  describe('return GOOGLE_PAY_MERCHANT_ID', () => {
    it('when GOOGLE_PAY_MERCHANT_ID_2 env var is set but GATEWAY_ACCOUNT_IDS_FOR_GOOGLE_PAY_MERCHANT_ID_2 is not set', () => {
      process.env.GOOGLE_PAY_MERCHANT_ID_2 = googlePayMerchantId2
      const { getMerchantId } = newGooglePayMerchantIdCalculator()
      expect(getMerchantId(gatewayAccountIdThatIsInGatewayAccountIdsForGooglePayMerchantId2)).to.equal(googlePayMerchantId)
    })

    it('when GOOGLE_PAY_MERCHANT_ID_2 env var is empty', () => {
      process.env.GATEWAY_ACCOUNT_IDS_FOR_GOOGLE_PAY_MERCHANT_ID_2 = gatewayAccountIdsForGooglePayMerchantId2
      const { getMerchantId } = newGooglePayMerchantIdCalculator()
      expect(getMerchantId(gatewayAccountIdThatIsInGatewayAccountIdsForGooglePayMerchantId2)).to.equal(googlePayMerchantId)
    })

    it('when GOOGLE_PAY_MERCHANT_ID_2 env var is set but gateway account is irrelevant', () => {
      process.env.GOOGLE_PAY_MERCHANT_ID_2 = googlePayMerchantId2
      process.env.GATEWAY_ACCOUNT_IDS_FOR_GOOGLE_PAY_MERCHANT_ID_2 = gatewayAccountIdsForGooglePayMerchantId2
      const { getMerchantId } = newGooglePayMerchantIdCalculator()
      expect(getMerchantId('irrelevant')).to.equal(googlePayMerchantId)
    })
  })

  describe('should return GOOGLE_PAY_MERCHANT_ID_2', () => {
    it('when GOOGLE_PAY_MERCHANT_ID_2 env var is set and gateway account is relevant', () => {
      process.env.GOOGLE_PAY_MERCHANT_ID_2 = googlePayMerchantId2
      process.env.GATEWAY_ACCOUNT_IDS_FOR_GOOGLE_PAY_MERCHANT_ID_2 = gatewayAccountIdsForGooglePayMerchantId2
      const { getMerchantId } = newGooglePayMerchantIdCalculator()
      expect(getMerchantId(gatewayAccountIdThatIsInGatewayAccountIdsForGooglePayMerchantId2)).to.equal(googlePayMerchantId2)
    })
  })
})

function newGooglePayMerchantIdCalculator () {
  return proxyquire('../../app/utils/google-pay-merchant-id-selector.js', {})
}
