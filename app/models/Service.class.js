'use strict'
const _ = require('lodash')
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
    console.log(serviceData.merchant_details.address_country)
    this.externalId = serviceData.external_id
    this.name = serviceData.name
    this.gatewayAccountIds = serviceData.gateway_account_ids
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
      countryName: countries.translateAlpha2(serviceData.merchant_details.address_country)
    } : undefined
  }

  /**
   * @method hasCustomBranding
   * @returns {boolean} if the service got a non-GOV.UK branding
   */
  hasCustomBranding () {
    return !_.isEmtpy(this.customBranding)
  }
}

module.exports = Service
