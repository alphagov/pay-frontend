const lodash = require('lodash')
const cardPaymentStubs = require('../../utils/card-payment-stubs')

describe('The footer displayed on payment pages', () => {
  const tokenId = 'be88a908-3b99-4254-9807-c855d53f6b2b'
  const chargeId = 'ub8de8r5mh4pb49rgm1ismaqfv'
  const language = 'en'

  it('should display the service name and address when service has full organisation details', () => {
    // use a unique gateway account id per test as services are cached
    const gatewayAccountId = lodash.random(999999999)
    const serviceOpts = {
      gateway_account_ids: [gatewayAccountId],
      merchant_details: {
        name: 'Org',
        address_line1: 'Street',
        address_line2: 'Borough',
        address_city: 'City',
        address_postcode: 'AW1H 9UX',
        address_country: 'GB'
      }
    }

    cy.task('setupStubs', cardPaymentStubs.buildCreatePaymentChargeStubs(tokenId, chargeId, language, gatewayAccountId, serviceOpts))
    cy.visit(`/secure/${tokenId}`)

    cy.get('[data-cy=footer]')
      .find('.govuk-footer__inline-list .govuk-footer__link')
      .should('have.length', 4)
      .then(($elements) => {
        expect($elements.eq(0).text()).to.contain('Privacy notice')
        expect($elements.eq(1).text()).to.contain('reCAPTCHA notice')
        expect($elements.eq(2).text()).to.contain('Cookies')
        expect($elements.eq(3).text()).to.contain('Accessibility statement')
      })

    cy.get('[data-cy=footer]')
      .find('.govuk-footer__meta-custom')
      .should('contain', 'Service provided by Org, Street, Borough, City, AW1H 9UX, United Kingdom')
  })

  it('should display the service name and address when service does not have a second line', () => {
    const gatewayAccountId = lodash.random(999999999)
    const serviceOpts = {
      gateway_account_ids: [gatewayAccountId],
      merchant_details: {
        name: 'Org',
        address_line1: 'Street',
        address_city: 'City',
        address_postcode: 'AW1H 9UX',
        address_country: 'GB'
      }
    }

    cy.task('setupStubs', cardPaymentStubs.buildCreatePaymentChargeStubs(tokenId, chargeId, language, gatewayAccountId, serviceOpts))
    cy.visit(`/secure/${tokenId}`)

    cy.get('[data-cy=footer]')
      .find('.govuk-footer__meta-custom')
      .should('contain', 'Service provided by Org, Street, City, AW1H 9UX, United Kingdom')
  })

  it('should display just the service name when mandatory address fields are missing', () => {
    const gatewayAccountId = lodash.random(999999999)
    const serviceOpts = {
      gateway_account_ids: [gatewayAccountId],
      merchant_details: {
        name: 'Org',
        address_city: 'City',
        address_postcode: 'AW1H 9UX',
        address_country: 'GB'
      }
    }

    cy.task('setupStubs', cardPaymentStubs.buildCreatePaymentChargeStubs(tokenId, chargeId, language, gatewayAccountId, serviceOpts))
    cy.visit(`/secure/${tokenId}`)

    cy.get('[data-cy=footer]')
      .find('.govuk-footer__meta-custom')
      .should('contain', 'Service provided by Org, City, AW1H 9UX, United Kingdom')
  })

  it('should not display the service details if there are no organisation for the service', () => {
    const gatewayAccountId = lodash.random(999999999)
    const serviceOpts = {
      gateway_account_ids: [gatewayAccountId],
      merchant_details: null
    }

    cy.task('setupStubs', cardPaymentStubs.buildCreatePaymentChargeStubs(tokenId, chargeId, language, gatewayAccountId, serviceOpts))
    cy.visit(`/secure/${tokenId}`)

    cy.get('[data-cy=footer]')
      .find('.govuk-footer__meta-custom')
      .should('not.exist')
  })

  it('should not display the service details if there is an organisation address but no organisation name', () => {
    const gatewayAccountId = lodash.random(999999999)
    const serviceOpts = {
      gateway_account_ids: [gatewayAccountId],
      merchant_details: {
        address_line1: 'Street',
        address_city: 'City',
        address_postcode: 'AW1H 9UX',
        address_country: 'GB'
      }
    }

    cy.task('setupStubs', cardPaymentStubs.buildCreatePaymentChargeStubs(tokenId, chargeId, language, gatewayAccountId, serviceOpts))
    cy.visit(`/secure/${tokenId}`)

    cy.get('[data-cy=footer]')
      .find('.govuk-footer__meta-custom')
      .should('not.exist')
  })
})
