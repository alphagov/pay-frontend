'use strict'

const { adminUsersGetService } = require('./stub-builders/service-stubs')
const { cardIdValidCardDetails } = require('./stub-builders/card-id-stubs')
const tokenStubs = require('./stub-builders/token-stubs')
const chargeStubs = require('./stub-builders/charge-stubs')

function confirmPaymentDetailsStubs (chargeId, validPayment = {}, gatewayAccountId = 42, additionalChargeOpts = {}, serviceOpts = {}) {
  return [
    adminUsersGetService(serviceOpts),
    chargeStubs.connectorMultipleSubsequentChargeDetails([{
      ...additionalChargeOpts,
      chargeId,
      gatewayAccountId,
      status: 'ENTERING CARD DETAILS',
      state: { finished: false, status: 'started' }
    }, {
      ...additionalChargeOpts,
      chargeId,
      gatewayAccountId,
      paymentDetails: {
        cardNumber: validPayment.cardNumber,
        expiryMonth: validPayment.expiryMonth,
        expiryYear: validPayment.expiryYear,
        name: validPayment.name,
        securityCode: validPayment.securityCode,
        addressLine1: validPayment.addressLine1,
        city: validPayment.city,
        postcode: validPayment.postcode,
        email: validPayment.email,
        noBillingAddress: validPayment.noBillingAddress
      },
      status: 'AUTHORISATION SUCCESS',
      state: { finished: false, status: 'submitted' }
    }]),
    cardIdValidCardDetails(),
    chargeStubs.connectorValidPatchConfirmedChargeDetails(chargeId)
  ]
}

function checkCardDetailsStubs (chargeId, gatewayAccountId = 42) {
  return [
    chargeStubs.connectorGetChargeDetails({
      chargeId,
      gatewayAccountId,
      status: 'ENTERING CARD DETAILS',
      state: { finished: false, status: 'started' }
    }),
    cardIdValidCardDetails()
  ]
}

function buildCancelChargeStub (chargeId, gatewayAccountId = 42, providerOpts = {}) {
  return [
    chargeStubs.connectorGetChargeDetails({
      chargeId,
      gatewayAccountId,
      status: 'ENTERING CARD DETAILS',
      state: { finished: false, status: 'started' },
      language: 'en',
      paymentProvider: providerOpts.paymentProvider,
      requires3ds: providerOpts.requires3ds,
      integrationVersion3ds: providerOpts.integrationVersion3ds,
      blockPrepaidCards: providerOpts.blockPrepaidCards
    }),
    chargeStubs.connectorCancelCharge(chargeId)
  ]
}

function buildCreatePaymentChargeStubs (tokenId, chargeId, language = 'en', gatewayAccountId = 42,
  serviceOpts = {}, providerOpts = {}, gatewayAccountOpts = {}, additionalChargeOpts = {}) {
  return [
    tokenStubs.connectorCreateChargeFromToken({
      ...additionalChargeOpts,
      tokenId,
      gatewayAccountId,
      status: 'CREATED',
      emailCollectionMode: gatewayAccountOpts.emailCollectionMode || 'MANDATORY',
      allowMoto: gatewayAccountOpts.allowMoto,
      motoMaskCardNumberInput: gatewayAccountOpts.motoMaskCardNumberInput,
      motoMaskCardSecurityCodeInput: gatewayAccountOpts.motoMaskCardSecurityCodeInput
    }),
    tokenStubs.connectorMarkTokenAsUsed(tokenId),
    chargeStubs.connectorGetChargeDetails({
      ...additionalChargeOpts,
      chargeId,
      gatewayAccountId,
      status: 'CREATED',
      state: { finished: false, status: 'created' },
      language: language || 'en',
      paymentProvider: providerOpts.paymentProvider,
      requires3ds: providerOpts.requires3ds,
      integrationVersion3ds: providerOpts.integrationVersion3ds,
      blockPrepaidCards: providerOpts.blockPrepaidCards,
      emailCollectionMode: gatewayAccountOpts.emailCollectionMode || 'MANDATORY',
      allowMoto: gatewayAccountOpts.allowMoto,
      motoMaskCardNumberInput: gatewayAccountOpts.motoMaskCardNumberInput,
      motoMaskCardSecurityCodeInput: gatewayAccountOpts.motoMaskCardSecurityCodeInput
    }),
    cardIdValidCardDetails(),
    chargeStubs.connectorUpdateChargeStatus(chargeId),
    adminUsersGetService(serviceOpts),
    chargeStubs.connectorWorldpay3dsFlexDdcJwt(chargeId)
  ]
}

function buildChargeFromTokenNotFound (tokenId) {
  return [
    tokenStubs.connectorChargeFromTokenNotFound(tokenId)
  ]
}

function buildUsedTokenAndReturnPaymentChargeStubs (tokenId, chargeId, status, gatewayAccountId = 42, serviceOpts = {}) {
  return [
    tokenStubs.connectorCreateChargeFromToken({ tokenId: tokenId, gatewayAccountId: gatewayAccountId, used: true, status: status }),
    tokenStubs.connectorMarkTokenAsUsed(tokenId),
    chargeStubs.connectorGetChargeDetails({
      chargeId,
      gatewayAccountId,
      status: status,
      state: { finished: false, status },
      language: 'en'
    }),
    chargeStubs.connectorUpdateChargeStatus(chargeId),
    adminUsersGetService(serviceOpts)
  ]
}

function buildCreatePaymentChargeWithPrefilledCardholderDeatilsStubs (tokenId, chargeId, gatewayAccountId = 42, chargeOpts = {}, serviceOpts = {}) {
  return [
    tokenStubs.connectorCreateChargeFromToken({ tokenId, gatewayAccountId }),
    tokenStubs.connectorMarkTokenAsUsed(tokenId),
    chargeStubs.connectorGetChargeDetailsWithPrefilledCardholderDetails({
      chargeId,
      gatewayAccountId,
      status: 'CREATED',
      state: { finished: false, status: 'created' },
      language: 'en',
      paymentDetails: {
        email: chargeOpts.email,
        cardholderName: chargeOpts.cardholderName,
        billingAddress: {
          addressLine1: chargeOpts.line1,
          addressLine2: chargeOpts.line2,
          postcode: chargeOpts.postcode,
          city: chargeOpts.city,
          country: chargeOpts.country
        },
        card_brand: ''
      }
    }),
    chargeStubs.connectorUpdateChargeStatus(chargeId),
    adminUsersGetService(serviceOpts)
  ]
}

module.exports = {
  confirmPaymentDetailsStubs,
  checkCardDetailsStubs,
  buildCancelChargeStub,
  buildCreatePaymentChargeStubs,
  buildCreatePaymentChargeWithPrefilledCardholderDeatilsStubs,
  buildUsedTokenAndReturnPaymentChargeStubs,
  buildChargeFromTokenNotFound
}
