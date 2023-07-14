const cardPaymentStubs = require('../../utils/card-payment-stubs')

const tokenId = 'be88a908-3b99-4254-9807-c855d53f6b2b'
const chargeId = 'ub8de8r5mh4pb49rgm1ismaqfv'
const checkCardDetailsStubs = cardPaymentStubs.checkCardDetailsStubs(chargeId)
const gatewayAccountId = 42

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
  describe('Email collection off', () => {
    const createPaymentChargeStubs = cardPaymentStubs.buildCreatePaymentChargeStubs(
      tokenId, chargeId, 'en', gatewayAccountId, {}, {}, { emailCollectionMode: 'OFF' })
    const confirmPaymentDetailsStubs = cardPaymentStubs.confirmPaymentDetailsStubs(chargeId, validPayment, gatewayAccountId, { emailCollectionMode: 'OFF' })

    it('Should redirect to the confirmation page when valid details are entered', () => {
      cy.task('setupStubs', createPaymentChargeStubs)
      cy.visit(`/secure/${tokenId}`)

      cy.location('pathname').should('eq', `/card_details/${chargeId}`)
      cy.window().its('chargeId').should('eq', `${chargeId}`)

      cy.get('#email').should('not.exist')

      cy.task('clearStubs')
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
      cy.get('#address-line-1').type(validPayment.addressLine1)
      cy.get('#address-city').type(validPayment.city)
      cy.get('#address-postcode').type(validPayment.postcode)

      cy.get('#email').should('not.exist')

      cy.task('clearStubs')
      cy.task('setupStubs', confirmPaymentDetailsStubs)

      cy.log('Submitting confirmation with valid details should redirect to confirmation page')

      cy.get('#card-details').submit()
      cy.location('pathname').should('eq', `/card_details/${chargeId}/confirm`)
      cy.get('#email').should('not.exist')
    })
  })

  describe('Email collection mandatory', () => {
    const createPaymentChargeStubs = cardPaymentStubs.buildCreatePaymentChargeStubs(tokenId, chargeId, 'en', gatewayAccountId, {}, {})
    const confirmPaymentDetailsStubs = cardPaymentStubs.confirmPaymentDetailsStubs(chargeId, validPayment, gatewayAccountId, { emailCollectionMode: 'MANDATORY' })

    it('Should show an error when an email is not provided', () => {
      cy.task('setupStubs', createPaymentChargeStubs)
      cy.visit(`/secure/${tokenId}`)

      cy.location('pathname').should('eq', `/card_details/${chargeId}`)
      cy.window().its('chargeId').should('eq', `${chargeId}`)

      cy.task('clearStubs')
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
      cy.get('#address-line-1').type(validPayment.addressLine1)
      cy.get('#address-city').type(validPayment.city)
      cy.get('#address-postcode').type(validPayment.postcode)

      cy.get('#email').should('exist')

      cy.log('Submitting confirmation should show email error')

      cy.task('clearStubs')
      cy.task('setupStubs', confirmPaymentDetailsStubs)
      cy.get('#card-details').submit()
      cy.location('pathname').should('eq', `/card_details/${chargeId}`)
      cy.get('#error-summary-title').should(($td) => expect($td).to.contain('The following fields are missing or contain errors'))
      cy.contains('Enter a valid email')
    })
  })

  describe('Email collection optional', () => {
    const createPaymentChargeStubs = cardPaymentStubs.buildCreatePaymentChargeStubs(
      tokenId, chargeId, 'en', gatewayAccountId, {}, {}, { emailCollectionMode: 'OPTIONAL' })
    const confirmPaymentDetailsStubs = cardPaymentStubs.confirmPaymentDetailsStubs(chargeId, validPayment, gatewayAccountId, { emailCollectionMode: 'OPTIONAL' })

    it('Should show the confirmation page when an email is not provided', () => {
      cy.task('setupStubs', createPaymentChargeStubs)
      cy.visit(`/secure/${tokenId}`)

      cy.location('pathname').should('eq', `/card_details/${chargeId}`)
      cy.window().its('chargeId').should('eq', `${chargeId}`)

      cy.log('Should enter card details')

      cy.task('clearStubs')
      cy.task('setupStubs', checkCardDetailsStubs)

      cy.intercept('POST', `/check_card/${chargeId}`).as('checkCard')

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

      cy.log('Submitting confirmation with valid details should redirect to confirmation page')

      cy.task('clearStubs')
      cy.task('setupStubs', confirmPaymentDetailsStubs)
      cy.get('#card-details').submit()
      cy.location('pathname').should('eq', `/card_details/${chargeId}/confirm`)
      cy.get('#email').should('not.exist')
    })
  })
})
