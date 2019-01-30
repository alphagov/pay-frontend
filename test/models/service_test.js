'use strict'

// NPM dependencies
const path = require('path')
const expect = require('chai').expect

// Local dependencies
const Service = require(path.join(__dirname, '/../../app/models/Service.class'))
const serviceFixtures = require('../fixtures/service_fixtures')

describe('Service model from service raw data', function () {
  it('should contain expected merchant details country name', function () {
    const serviceModel = new Service(serviceFixtures.validServiceResponse({
      merchant_details: {
        name: 'Give Me Your Money',
        address_line1: 'Clive House',
        address_line2: '10 Downing Street',
        address_city: 'London',
        address_postcode: 'AW1H 9UX',
        address_country: 'GB'
      }
    }).getPlain())

    expect(serviceModel.merchantDetails.countryName).to.equal('United Kingdom')
  })

  it('should return merchant details as undefined when not in raw data', function () {
    const data = {
      external_id: '1234',
      name: 'service name',
      gateway_account_ids: [1],
      custom_branding: { css_url: 'css url', image_url: 'image url' }
    }

    const serviceModel = new Service(data)

    expect(serviceModel.merchantDetails).to.equal(undefined)
  })
})
