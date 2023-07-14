const lodash = require('lodash')
const cardPaymentStubs = require('../../utils/card-payment-stubs')

const tokenId = 'be88a908-3b99-4254-9807-c855d53f6b2b'
const chargeId = 'ub8de8r5mh4pb49rgm1ismaqfv'

const validPayment = {
  cardNumber: '4444333322221111',
  expiryMonth: '01',
  expiryYear: '30',
  name: 'Valid Paying Name',
  securityCode: '012',
  email: 'foo@example.com',
  noBillingAddress: true
}

describe('Billing address collection', () => {
  describe('Billing address collection enabled for service', () => {
    describe('Default billing address country set', () => {
      // get a random gateway account per test as service is cached against gateway account
      const gatewayAccountId = lodash.random(999999999)
      const serviceOpts = {
        collect_billing_address: true,
        default_billing_address_country: 'IE'
      }
      const chargeOpts = { moto: false }
      const createPaymentChargeStubs = cardPaymentStubs.buildCreatePaymentChargeStubs(
        tokenId, chargeId, 'en', gatewayAccountId, serviceOpts, {}, {}, chargeOpts)

      it('Should show billing address section and populate with default billing address', () => {
        cy.task('setupStubs', createPaymentChargeStubs)
        cy.visit(`/secure/${tokenId}`)

        cy.log('should show the billing address section')

        cy.get('h2').contains('Billing address').should('exist')
        cy.get('#address-country-select').should('exist')
        cy.get('#address-line-1').should('exist')
        cy.get('#address-line-2').should('exist')
        cy.get('#address-city').should('exist')
        cy.get('#address-postcode').should('exist')

        cy.log('Should populate default billing address from service')

        // The select is hidden when JavaScript is enabled, and the govuk-country-and-territory-autocomplete is displayed instead
        // Doesn't seem possible to get the text displayed in the input using selectors, so just look at the select
        cy.get('#address-country-select').should('have.value', 'IE')
        cy.get('#address-country-select').find('option:selected').should('have.text', 'Ireland')
      })
    })

    describe('Default billing address country not set', () => {
      // get a random gateway account per test as service is cached against gateway account
      const gatewayAccountId = lodash.random(999999999)
      const serviceOpts = {
        collect_billing_address: true,
        default_billing_address_country: null
      }
      const chargeOpts = { moto: false }
      const createPaymentChargeStubs = cardPaymentStubs.buildCreatePaymentChargeStubs(
        tokenId, chargeId, 'en', gatewayAccountId, serviceOpts, {}, {}, chargeOpts)

      it('Should have blank billing address country', () => {
        cy.task('setupStubs', createPaymentChargeStubs)
        cy.visit(`/secure/${tokenId}`)

        // The select is hidden when JavaScript is enabled, and the govuk-country-and-territory-autocomplete is displayed instead
        // Doesn't seem possible to get the text displayed in the input using selectors, so just look at the select
        cy.get('#address-country-select').should('have.value', null)
        cy.get('#address-country-select').find('option:selected').should('have.text', 'Pick a country or territory')
      })
    })
  })

  describe('Billing address collection disabled for service', () => {
    // get a random gateway account per test as service is cached against gateway account
    const gatewayAccountId = lodash.random(999999999)
    const serviceOpts = { collect_billing_address: false }
    const chargeOpts = { moto: false }
    const createPaymentChargeStubs = cardPaymentStubs.buildCreatePaymentChargeStubs(
      tokenId, chargeId, 'en', gatewayAccountId, serviceOpts, {}, {}, chargeOpts)

    it('Should not show the billing address section and allow valid card submission', () => {
      cy.task('setupStubs', createPaymentChargeStubs)
      cy.visit(`/secure/${tokenId}`)

      cy.log('Should not show the billing address section')

      cy.get('h2').contains('Billing address').should('not.exist')
      cy.get('#address-country-select').should('not.exist')
      cy.get('#address-line-1').should('not.exist')
      cy.get('#address-line-2').should('not.exist')
      cy.get('#address-city').should('not.exist')
      cy.get('#address-postcode').should('not.exist')

      cy.task('clearStubs')

      const checkCardDetailsStubs = cardPaymentStubs.checkCardDetailsStubs(chargeId)
      cy.task('setupStubs', checkCardDetailsStubs)

      cy.intercept('POST', `/check_card/${chargeId}`).as('checkCard')

      cy.log('Should enter card details')

      cy.get('#card-no').type(validPayment.cardNumber)
      cy.get('#card-no').blur()
      cy.wait('@checkCard')
      cy.get('#expiry-month').type(validPayment.expiryMonth)
      cy.get('#expiry-year').type(validPayment.expiryYear)
      cy.get('#cardholder-name').type(validPayment.name)
      cy.get('#cvc').type(validPayment.securityCode)
      cy.get('#email').type(validPayment.email)

      cy.log('Submitting confirmation with valid details should redirect to confirmation page')

      cy.task('clearStubs')

      const confirmPaymentDetailsStubs = cardPaymentStubs.confirmPaymentDetailsStubs(chargeId, validPayment, gatewayAccountId, chargeOpts, serviceOpts)
      cy.task('setupStubs', confirmPaymentDetailsStubs)
      cy.get('#card-details').submit()
      cy.location('pathname').should('eq', `/card_details/${chargeId}/confirm`)

      cy.get('th').contains('Billing address').should('not.exist')
    })
  })

  describe('MOTO payment with billing address enabled for service', () => {
    // get a random gateway account per test as service is cached against gateway account
    const gatewayAccountId = lodash.random(999999999)
    const serviceOpts = { collect_billing_address: true }
    const chargeOpts = { moto: true }
    const createPaymentChargeStubs = cardPaymentStubs.buildCreatePaymentChargeStubs(
      tokenId, chargeId, 'en', gatewayAccountId, serviceOpts, {}, {}, chargeOpts)

    it('Should not show the billing address section and allow valid card submission', () => {
      cy.task('setupStubs', createPaymentChargeStubs)
      cy.visit(`/secure/${tokenId}`)

      cy.log('should not show the billing address section')

      cy.get('h2').contains('Billing address').should('not.exist')
      cy.get('#address-country-select').should('not.exist')
      cy.get('#address-line-1').should('not.exist')
      cy.get('#address-line-2').should('not.exist')
      cy.get('#address-city').should('not.exist')
      cy.get('#address-postcode').should('not.exist')

      cy.log('should enter card details')

      cy.task('clearStubs')

      const checkCardDetailsStubs = cardPaymentStubs.checkCardDetailsStubs(chargeId)
      cy.task('setupStubs', checkCardDetailsStubs)

      cy.intercept('POST', `/check_card/${chargeId}`).as('checkCard')

      cy.get('#card-no').type(validPayment.cardNumber)
      cy.get('#card-no').blur()
      cy.wait('@checkCard')
      cy.get('#expiry-month').type(validPayment.expiryMonth)
      cy.get('#expiry-year').type(validPayment.expiryYear)
      cy.get('#cardholder-name').type(validPayment.name)
      cy.get('#cvc').type(validPayment.securityCode)
      cy.get('#email').type(validPayment.email)

      cy.log('Submitting confirmation with valid details should redirect to confirmation page')

      cy.task('clearStubs')

      const confirmPaymentDetailsStubs = cardPaymentStubs.confirmPaymentDetailsStubs(chargeId, validPayment, gatewayAccountId, chargeOpts, serviceOpts)
      cy.task('setupStubs', confirmPaymentDetailsStubs)
      cy.get('#card-details').submit()
      cy.location('pathname').should('eq', `/card_details/${chargeId}/confirm`)

      cy.get('th').contains('Billing address').should('not.exist')
    })
  })
})
