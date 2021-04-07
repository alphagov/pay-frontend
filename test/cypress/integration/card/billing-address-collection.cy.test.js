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
    // get a random gateway account per test as service is cached against gateway account
    const gatewayAccountId = lodash.random(999999999)
    const serviceOpts = { collect_billing_address: true }
    const chargeOpts = { moto: false }
    const createPaymentChargeStubs = cardPaymentStubs.buildCreatePaymentChargeStubs(
      tokenId, chargeId, 'en', gatewayAccountId, serviceOpts, {}, {}, chargeOpts)

    it('Should show the billing address section', () => {
      cy.task('setupStubs', createPaymentChargeStubs)
      cy.visit(`/secure/${tokenId}`)

      cy.get('h2').contains('Billing address').should('exist')
      cy.get('#address-country-select').should('exist')
      cy.get('#address-line-1').should('exist')
      cy.get('#address-line-2').should('exist')
      cy.get('#address-city').should('exist')
      cy.get('#address-postcode').should('exist')
    })
  })

  describe('Billing address collection disabled for service', () => {
    // get a random gateway account per test as service is cached against gateway account
    const gatewayAccountId = lodash.random(999999999)
    const serviceOpts = { collect_billing_address: false }
    const chargeOpts = { moto: false }
    const createPaymentChargeStubs = cardPaymentStubs.buildCreatePaymentChargeStubs(
      tokenId, chargeId, 'en', gatewayAccountId, serviceOpts, {}, {}, chargeOpts)

    beforeEach(() => {
      // preserve cookies so we can prodeed with payment flow
      Cypress.Cookies.preserveOnce('frontend_state')
    })

    it('Should not show the billing address section', () => {
      cy.task('setupStubs', createPaymentChargeStubs)
      cy.visit(`/secure/${tokenId}`)

      cy.get('h2').contains('Billing address').should('not.exist')
      cy.get('#address-country-select').should('not.exist')
      cy.get('#address-line-1').should('not.exist')
      cy.get('#address-line-2').should('not.exist')
      cy.get('#address-city').should('not.exist')
      cy.get('#address-postcode').should('not.exist')
    })

    it('Should enter card details', () => {
      const checkCardDetailsStubs = cardPaymentStubs.checkCardDetailsStubs(chargeId)
      cy.task('setupStubs', checkCardDetailsStubs)

      cy.server()
      cy.route('POST', `/check_card/${chargeId}`).as('checkCard')

      cy.get('#card-no').type(validPayment.cardNumber)
      cy.get('#card-no').blur()
      cy.wait('@checkCard')
      cy.get('#expiry-month').type(validPayment.expiryMonth)
      cy.get('#expiry-year').type(validPayment.expiryYear)
      cy.get('#cardholder-name').type(validPayment.name)
      cy.get('#cvc').type(validPayment.securityCode)
      cy.get('#email').type(validPayment.email)
    })

    it('Submitting confirmation with valid details should redirect to confirmation page', () => {
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

    beforeEach(() => {
      // preserve cookies so we can proceed with payment flow
      Cypress.Cookies.preserveOnce('frontend_state')
    })

    it('Should not show the billing address section', () => {
      cy.task('setupStubs', createPaymentChargeStubs)
      cy.visit(`/secure/${tokenId}`)

      cy.get('h2').contains('Billing address').should('not.exist')
      cy.get('#address-country-select').should('not.exist')
      cy.get('#address-line-1').should('not.exist')
      cy.get('#address-line-2').should('not.exist')
      cy.get('#address-city').should('not.exist')
      cy.get('#address-postcode').should('not.exist')
    })

    it('Should enter card details', () => {
      const checkCardDetailsStubs = cardPaymentStubs.checkCardDetailsStubs(chargeId)
      cy.task('setupStubs', checkCardDetailsStubs)

      cy.server()
      cy.route('POST', `/check_card/${chargeId}`).as('checkCard')

      cy.get('#card-no').type(validPayment.cardNumber)
      cy.get('#card-no').blur()
      cy.wait('@checkCard')
      cy.get('#expiry-month').type(validPayment.expiryMonth)
      cy.get('#expiry-year').type(validPayment.expiryYear)
      cy.get('#cardholder-name').type(validPayment.name)
      cy.get('#cvc').type(validPayment.securityCode)
      cy.get('#email').type(validPayment.email)
    })

    it('Submitting confirmation with valid details should redirect to confirmation page', () => {
      const confirmPaymentDetailsStubs = cardPaymentStubs.confirmPaymentDetailsStubs(chargeId, validPayment, gatewayAccountId, chargeOpts, serviceOpts)
      cy.task('setupStubs', confirmPaymentDetailsStubs)
      cy.get('#card-details').submit()
      cy.location('pathname').should('eq', `/card_details/${chargeId}/confirm`)

      cy.get('th').contains('Billing address').should('not.exist')
    })
  })
})
