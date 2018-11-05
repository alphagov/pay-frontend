'use strict'

// Local dependencies
const pactBase = require('./pact_base')
const random = require('../../app/utils/random')

// Global setup
const pactServices = pactBase({array: ['service_ids']})

module.exports = {
  validServiceResponse: (serviceData = {}) => {
    const defaultCustomBranding = {css_url: 'css url', image_url: 'image url'}
    const defaultMerchantDetails = {
      name: 'Give Me Your Money',
      address_line1: 'Clive House',
      address_line2: '10 Downing Street',
      address_city: 'London',
      address_postcode: 'AW1H 9UX',
      address_country: 'GB'
    }
    const data = {
      external_id: serviceData.external_id || random.randomUuid(),
      name: serviceData.name || 'service name',
      gateway_account_ids: serviceData.gateway_account_ids || [random.randomInt(1, 9999999)],
      custom_branding: serviceData.custom_branding || defaultCustomBranding,
      merchant_details: serviceData.merchant_details || defaultMerchantDetails,
      redirect_to_service_immediately_on_terminal_state: serviceData.redirect_to_service_immediately_on_terminal_state === true
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
