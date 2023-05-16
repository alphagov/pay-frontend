const {walletEnabled} = require('../../app/controllers/charge.controller')
const assert = require('assert')

describe('walletEnabled', () => {
  const testData = [
    { walletToggle: true, gatewayAccountId: "1", payTestGatewayAccounts: ["5", "10", "15", "20"], expected: true },
    { walletToggle: false, gatewayAccountId: "1", payTestGatewayAccounts: ["5", "10", "15", "20"], expected: false },
    { walletToggle: false, gatewayAccountId: "15", payTestGatewayAccounts: ["5", "10", "15", "20"], expected: true },
  ]

  testData.forEach(({ walletToggle, gatewayAccountId, payTestGatewayAccounts, expected }) => {
    it(`should return ${expected} when toggle is ${walletToggle}, gateway account id is ${gatewayAccountId} and the test gateway accoounts are ${payTestGatewayAccounts}`, () => {
      const result = walletEnabled(walletToggle, gatewayAccountId, payTestGatewayAccounts)
      assert.strictEqual(result, expected)
    })
  })
})
