const cardPaymentStubs = require('../../utils/card-payment-stubs')

const tokenId = 'be88a908-3b99-4254-9807-c855d53f6b2b'
const chargeId = 'ub8de8r5mh4pb49rgm1ismaqfv'
const createPaymentChargeStubs = cardPaymentStubs.buildCreatePaymentChargeStubs(tokenId, chargeId, 'en')
const checkCardDetailsStubs = cardPaymentStubs.checkCardDetailsStubs(chargeId)

describe('Card details page validation', () => {
  beforeEach(() => {
    // this test is for the full process, the session should be maintained
    // as it would for an actual payment flow
    Cypress.Cookies.preserveOnce('frontend_state')
  })

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
  })

  it('Submitting confirmation should show errors', () => {
    cy.get('#card-details').submit()
    cy.location('pathname').should('eq', `/card_details/${chargeId}`)
    cy.get('#error-summary').should('exist')
    cy.get('#error-summary-title').should(($td) => expect($td).to.contain('The following fields are missing or contain errors'))
    cy.get('#cardholder-name-error').should('exist')
    cy.get('#cvc-error').should('exist')
    cy.get('#expiry-date-error').should('exist')
    cy.get('#address-line-1-error').should('exist')
    cy.get('#address-city-error').should('exist')
    cy.get('#address-postcode-error').should('exist')
    cy.get('#email-error').should('exist')
    cy.get('.card-holder-name-label').should('exist')
    cy.get('.cvc-label').should('exist')
    cy.get('.expiry-date-label').should('exist')
    cy.get('.email-label').should('exist')
    cy.get('.address-line-1-label').should('exist')
    cy.get('.address-city-label').should('exist')
    cy.get('.address-postcode-label').should('exist')
  })
})
