'use strict'

// NPM dependencies
const lodash = require('lodash')

// Local dependencies
const countries = require('../services/countries')

/**
 @class Service
 * @property {string} externalId - The external ID of the service
 * @property {string} name -  The name of the service
 * @property {string[]} gatewayAccountIds -  list of gateway account id's that belong to this service
 * @property {string} customBranding -  custom (non-GOV.UK) styling for the service.
 */
class Service {
  /**
   * Create an instance of Service
   * @param {Object} serviceData - raw 'service' object from server
   * @returns {Object} service - internal representation of the service object
   **/
  constructor (serviceData) {
    this.externalId = serviceData.external_id
    this.name = serviceData.service_name
    this.gatewayAccountIds = serviceData.gateway_account_ids
    this.redirectToServiceImmediatelyOnTerminalState = serviceData.redirect_to_service_immediately_on_terminal_state
    this.collectBillingAddress = serviceData.collect_billing_address

    this.customBranding =
      serviceData.custom_branding ? {
        cssUrl: serviceData.custom_branding.css_url,
        imageUrl: serviceData.custom_branding.image_url
      } : undefined

    this.merchantDetails = serviceData.merchant_details ? {
      name: serviceData.merchant_details.name,
      addressLine1: serviceData.merchant_details.address_line1,
      addressLine2: serviceData.merchant_details.address_line2,
      city: serviceData.merchant_details.address_city,
      postcode: serviceData.merchant_details.address_postcode,
      countryName: countries.translateCountryISOtoName(serviceData.merchant_details.address_country)
    } : undefined
  }

  /**
   * @method hasCustomBranding
   * @returns {boolean} if the service got a non-GOV.UK branding
   */
  hasCustomBranding () {
    return !lodash.isEmpty(this.customBranding)
  }

  /**
   * @method hasMerchantDetails
   *
   * All services must have merchant details defined for all gateway accounts
   * This will be kept as backward compatibility until merchant details are
   * enforced.
   *
   * @returns {boolean} if the service got merchant details specified
   */
  hasMerchantDetails () {
    return !lodash.isEmpty(this.merchantDetails)
  }
}

module.exports = Service
