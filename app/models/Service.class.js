'use strict'
const _ = require('lodash')

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
   * @param {string} serviceData.external_id - The external ID of the service
   * @param {string} serviceData.name - The name of the service
   * @param {string[]} serviceData.gateway_account_ids - list of gateway account id's that belong to this service
   * @property {string} customBranding -  custom (non-GOV.UK) styling for the service.
   **/
  constructor (serviceData) {
    this.externalId = serviceData.external_id
    this.name = serviceData.name
    this.gatewayAccountIds = serviceData.gateway_account_ids
    this.customBranding =
      serviceData.custom_branding ? {
        cssUrl: serviceData.custom_branding.css_url,
        imageUrl: serviceData.custom_branding.image_url
      } : undefined
  }

  /**
   * @method toJson
   * @returns {Object} An 'adminusers' compatible representation of the service
   */
  toJson () {
    return {
      external_id: this.externalId,
      name: this.name,
      gateway_account_ids: this.gatewayAccountIds,
      custom_branding: this.customBranding ? {
        css_url: this.customBranding.cssUrl,
        image_url: this.customBranding.imageUrl
      } : undefined
    }
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
