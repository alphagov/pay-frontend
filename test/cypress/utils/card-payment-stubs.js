'use strict'

const buildCreatePaymentChargeStubs = function buildCreatePaymentChargeStubs (tokenId, chargeId, language, gatewayAccountId = 42, serviceOpts = {}) {
  return [
    { name: 'connectorCreateChargeFromToken', opts: { tokenId, gatewayAccountId } },
    { name: 'connectorDeleteToken', opts: { tokenId } },
    {
      name: 'connectorGetChargeDetails',
      opts: {
        chargeId,
        gatewayAccountId,
        status: 'CREATED',
        state: { finished: false, status: 'created' },
        language: language || 'en'
      }
    },
    { name: 'connectorUpdateChargeStatus', opts: { chargeId } },

    // @TODO(sfount) this should pass the service to be queried relative to the charge - right now it just returns a default service
    { name: 'adminUsersGetService', opts: serviceOpts }
  ]
}

const buildCreatePaymentChargeWithPrefilledCardholderDeatilsStubs = (tokenId, chargeId, gatewayAccountId = 42, chargeOpts = {}, serviceOpts = {}) => {
  return [
    { name: 'connectorCreateChargeFromToken', opts: { tokenId, gatewayAccountId } },
    { name: 'connectorDeleteToken', opts: { tokenId } },
    {
      name: 'connectorGetChargeDetailsWithPrefilledCardholderDetails',
      opts: {
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
      }
    },
    { name: 'connectorUpdateChargeStatus', opts: { chargeId } },

    { name: 'adminUsersGetService', opts: serviceOpts }
  ]
}

module.exports = {
  buildCreatePaymentChargeStubs,
  buildCreatePaymentChargeWithPrefilledCardholderDeatilsStubs
}
