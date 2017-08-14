'use strict'

// Custom dependencies
const pactBase = require('./pact_base')

// Global setup
const pactServices = pactBase({array: ['service_ids']})

let random = require('../../app/utils/random')

module.exports = {

  validServiceResponse: (serviceData = {}) => {
    let defaultCustomBranding = {css_url: 'css url', image_url: 'image url'}
    let data = {
      external_id: serviceData.external_id || random.randomUuid(),
      name: serviceData.name || 'service name',
      gateway_account_ids: serviceData.gateway_account_ids || [random.randomInt()],
      custom_branding: serviceData.custom_branding || defaultCustomBranding
    }

    return {
      getPactified: () => {
        return pactServices.pactify(data)
      },
      getPlain: () => {
        return data
      }
    }
  }
}
