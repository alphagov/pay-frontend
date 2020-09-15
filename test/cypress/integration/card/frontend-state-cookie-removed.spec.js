const cardPaymentStubs = require('../../utils/card-payment-stubs')

describe('Frontend state cookie removed', () => {

  const tokenId = 'be88a908-3b99-4254-9807-c855d53f6b2b'
  const chargeId = 'ub8de8r5mh4pb49rgm1ismaqfv'

  const validPayment = {
    cardNumber: '4444333322221111',
    expiryMonth: '01',
    expiryYear: '30',
    name: 'Valid Paying Name',
    securityCode: '012',
    addressLine1: '10 Valid Paying Address',
    city: 'London',
    postcode: 'E1 8QS',
    email: 'validpayingemail@example.com'
  }

  const createPaymentChargeStubsEnglish = cardPaymentStubs.buildCreatePaymentChargeStubs(tokenId, chargeId, 'en')
  const checkCardDetailsStubs = cardPaymentStubs.checkCardDetailsStubs(chargeId)

  beforeEach(() => {
    // this test is for the full process, the session should be maintained
    // as it would for an actual payment flow
    Cypress.Cookies.preserveOnce('frontend_state')
  })

  describe('Should show "Your payment session has expired" if cookie is removed before submitting the payment', () => {
    it('Should setup the payment and load the page', () => {
      cy.task('setupStubs', createPaymentChargeStubsEnglish)
      cy.visit(`/secure/${tokenId}`)
    })

    it('Should enter and validate a correct card', () => {
      cy.task('setupStubs', checkCardDetailsStubs)

      cy.server()
      cy.route('POST', `/check_card/${chargeId}`).as('checkCard')

      cy.get('#card-no').type(validPayment.cardNumber)
      cy.get('#card-no').blur()
      cy.wait('@checkCard')
      cy.get('#card-no').should('not.have.class', 'govuk-input--error')
    })

    it('Should enter payment details', () => {
      cy.get('#expiry-month').type(validPayment.expiryMonth)
      cy.get('#expiry-year').type(validPayment.expiryYear)
      cy.get('#cardholder-name').type(validPayment.name)
      cy.get('#cvc').type(validPayment.securityCode)
      cy.get('#address-line-1').type(validPayment.addressLine1)
      cy.get('#address-city').type(validPayment.city)
      cy.get('#address-postcode').type(validPayment.postcode)
      cy.get('#email').type(validPayment.email)
    })

    it('Should show "Your payment session has expired"', () => {
      cy.clearCookie("frontend_state")

      cy.get('#card-details').submit()

      cy.location('pathname').should('eq', `/card_details/${chargeId}`)
      cy.get('h1').should('contain', 'Your payment session has expired')
    })
  })
})