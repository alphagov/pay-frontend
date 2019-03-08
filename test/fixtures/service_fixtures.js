'use strict'

// NPM dependencies
const lodash = require('lodash')

// Local dependencies
const pactBase = require('./pact_base')

// Global setup
const pactServices = pactBase({ array: ['service_ids'] })

module.exports = {
  validServiceResponse: (opts = {}) => {
    let defaultServiceName = 'service name'
    const data = {
      external_id: opts.external_id || 'external-id',
      name: opts.name || defaultServiceName,
      gateway_account_ids: opts.gateway_account_ids || [lodash.random(9999999)],
      service_name: {
        'en': { en: opts.name || defaultServiceName }
      },
      redirect_to_service_immediately_on_terminal_state: opts.redirect_to_service_immediately_on_terminal_state === true,
      collect_billing_address: typeof opts.collect_billing_address === 'undefined' || opts.collect_billing_address
    }

    if (opts.merchant_details === undefined) {
      data.merchant_details = {
        name: 'Give Me Your Money',
        address_line1: 'Clive House',
        address_line2: '10 Downing Street',
        address_city: 'London',
        address_postcode: 'AW1H 9UX',
        address_country: 'GB'
      }
    } else if (opts.merchant_details !== null) {
      data.merchant_details = lodash.pick(opts.merchant_details, [
        'name',
        'address_line1',
        'address_line2',
        'address_city',
        'address_postcode',
        'address_country',
        'email',
        'telephone_number'
      ])
    }

    if (opts.custom_branding) {
      data.custom_branding = {
        css_url: opts.custom_branding.css_url,
        image_url: opts.custom_branding.image_url
      }
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
