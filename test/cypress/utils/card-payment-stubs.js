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

module.exports = { buildCreatePaymentChargeStubs }
