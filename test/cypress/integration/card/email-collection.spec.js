const cardPaymentStubs = require('../../utils/card-payment-stubs')

const tokenId = 'be88a908-3b99-4254-9807-c855d53f6b2b'
const chargeId = 'ub8de8r5mh4pb49rgm1ismaqfv'
const checkCardDetailsStubs = cardPaymentStubs.checkCardDetailsStubs(chargeId)

const validPayment = {
  cardNumber: '4444333322221111',
  expiryMonth: '01',
  expiryYear: '30',
  name: 'Valid Paying Name',
  securityCode: '012',
  addressLine1: '10 Valid Paying Address',
  city: 'London',
  postcode: 'E1 8QS'
}

describe('Standard card payment flow', () => {
  beforeEach(() => {
    // this test is for the full process, the session should be maintained
    // as it would for an actual payment flow
    Cypress.Cookies.preserveOnce('frontend_state')
  })

  describe('Email collection off', () => {
    const createPaymentChargeStubs = cardPaymentStubs.buildCreatePaymentChargeStubs(
      tokenId, chargeId, 'en', 42, {}, {}, { emailCollectionMode: 'OFF' })
    const confirmPaymentDetailsStubs = cardPaymentStubs.confirmPaymentDetailsStubs(chargeId, validPayment, 'OFF')

    it('Should setup the payment and load the page', () => {
      cy.task('setupStubs', createPaymentChargeStubs)
      cy.visit(`/secure/${tokenId}`)

      cy.location('pathname').should('eq', `/card_details/${chargeId}`)
      cy.window().its('chargeId').should('eq', `${chargeId}`)

      cy.get('#email').should('not.exist')
    })

    it('Should enter card details', () => {
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
      cy.get('#address-line-1').type(validPayment.addressLine1)
      cy.get('#address-city').type(validPayment.city)
      cy.get('#address-postcode').type(validPayment.postcode)

      cy.get('#email').should('not.exist')
    })

    it('Submitting confirmation with valid details should redirect to confirmation page', () => {
      cy.task('setupStubs', confirmPaymentDetailsStubs)
      cy.get('#card-details').submit()
      cy.location('pathname').should('eq', `/card_details/${chargeId}/confirm`)
      cy.get('#email').should('not.exist')
    })
  })

  describe('Email collection mandatory', () => {
    const createPaymentChargeStubs = cardPaymentStubs.buildCreatePaymentChargeStubs(tokenId, chargeId, 'en', 42, {}, {})
    const confirmPaymentDetailsStubs = cardPaymentStubs.confirmPaymentDetailsStubs(chargeId, validPayment)

    it('Should setup the payment and load the page', () => {
      cy.task('setupStubs', createPaymentChargeStubs)
      cy.visit(`/secure/${tokenId}`)

      cy.location('pathname').should('eq', `/card_details/${chargeId}`)
      cy.window().its('chargeId').should('eq', `${chargeId}`)
    })

    it('Should enter card details', () => {
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
      cy.get('#address-line-1').type(validPayment.addressLine1)
      cy.get('#address-city').type(validPayment.city)
      cy.get('#address-postcode').type(validPayment.postcode)

      cy.get('#email').should('exist')
    })

    it('Submitting confirmation should show email error', () => {
      cy.task('setupStubs', confirmPaymentDetailsStubs)
      cy.get('#card-details').submit()
      cy.location('pathname').should('eq', `/card_details/${chargeId}`)
      cy.get('#error-summary-title').should(($td) => expect($td).to.contain('The following fields are missing or contain errors'))
      cy.contains('Enter a valid email')
    })
  })

  describe('Email collection optional', () => {
    const createPaymentChargeStubs = cardPaymentStubs.buildCreatePaymentChargeStubs(
      tokenId, chargeId, 'en', 42, {}, {}, { emailCollectionMode: 'OPTIONAL' })
    const confirmPaymentDetailsStubs = cardPaymentStubs.confirmPaymentDetailsStubs(chargeId, validPayment, 'OPTIONAL')

    it('Should setup the payment and load the page', () => {
      cy.task('setupStubs', createPaymentChargeStubs)
      cy.visit(`/secure/${tokenId}`)

      cy.location('pathname').should('eq', `/card_details/${chargeId}`)
      cy.window().its('chargeId').should('eq', `${chargeId}`)
    })

    it('Should enter card details', () => {
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
      cy.get('#address-line-1').type(validPayment.addressLine1)
      cy.get('#address-city').type(validPayment.city)
      cy.get('#address-postcode').type(validPayment.postcode)

      cy.get('#email').should('exist')
    })

    it('Submitting confirmation with valid details should redirect to confirmation page', () => {
      cy.task('setupStubs', confirmPaymentDetailsStubs)
      cy.get('#card-details').submit()
      cy.location('pathname').should('eq', `/card_details/${chargeId}/confirm`)
      cy.get('#email').should('not.exist')
    })
  })
})
