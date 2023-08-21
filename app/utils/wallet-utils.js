'use strict'

const logger = require('../utils/logger')(__filename)

function applePayEnabled (charge) {
  const applePayEnabledForWorldpay = (process.env.WORLDPAY_APPLE_PAY_ENABLED || 'true') === 'true'
  const applePayEnabledForStripe = (process.env.STRIPE_APPLE_PAY_ENABLED || 'true') === 'true'

  const globallyEnabledForProvider = (charge.paymentProvider === 'worldpay' && applePayEnabledForWorldpay) ||
    (charge.paymentProvider === 'stripe' && applePayEnabledForStripe)

  return (globallyEnabledForProvider || shouldOverrideGlobalWalletFlagForGatewayAccount(charge)) &&
    charge.gatewayAccount.allowApplePay
}

function googlePayEnabled (charge) {
  const googlePayEnabledForWorldpay = (process.env.WORLDPAY_GOOGLE_PAY_ENABLED || 'true') === 'true'
  const googlePayEnabledForStripe = (process.env.STRIPE_GOOGLE_PAY_ENABLED || 'true') === 'true'

  const globallyEnabledForProvider = (charge.paymentProvider === 'worldpay' && googlePayEnabledForWorldpay) ||
    (charge.paymentProvider === 'stripe' && googlePayEnabledForStripe)

  return (globallyEnabledForProvider || shouldOverrideGlobalWalletFlagForGatewayAccount(charge)) &&
    charge.gatewayAccount.allowGooglePay
}

function shouldOverrideGlobalWalletFlagForGatewayAccount (charge) {
  const payTestGatewayAccounts = (process.env.PAY_TEST_GATEWAY_ACCOUNTS || '').split(',')
  const gatewayAccountId = charge.gatewayAccount.gatewayAccountId.toString()
  if (payTestGatewayAccounts.includes(gatewayAccountId)) {
    logger.warn(`Overriding environment wallet setting to true for gateway account [gatewayAccountId=${gatewayAccountId}]`)
    return true
  }
  return false
}

module.exports = {
  applePayEnabled,
  googlePayEnabled
}
