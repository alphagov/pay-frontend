'use strict'

// Custom dependencies
const pactBase = require('./pact_base')

// Global setup
const pactServices = pactBase({array: ['service_ids']})

let random = require('../../app/utils/random')

module.exports = {
  validServiceResponse: (serviceData = {}) => {
    let defaultCustomBranding = {css_url: 'css url', image_url: 'image url'}
    let defaultMerchantDetais = { name: 'Give Me Your Money',
      address_line1: 'Clive House',
      address_line2: '10 Downing Street',
      address_city: 'London',
      address_postcode: 'AW1H 9UX',
      address_country: 'GB'
    }
    let data = {
      external_id: serviceData.external_id || random.randomUuid(),
      name: serviceData.name || 'service name',
      gateway_account_ids: serviceData.gateway_account_ids || [random.randomInt()],
      custom_branding: serviceData.custom_branding || defaultCustomBranding,
      merchant_details: serviceData.merchant_details || defaultMerchantDetais
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
