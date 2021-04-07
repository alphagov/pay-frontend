const cardPaymentStubs = require('../../utils/card-payment-stubs')

const tokenId = 'be88a908-3b99-4254-9807-c855d53f6b2b'
const chargeId = 'ub8de8r5mh4pb49rgm1ismaqfv'
const createPaymentChargeStubs = cardPaymentStubs.buildCreatePaymentChargeStubs(tokenId, chargeId, 'en')
const createCancelChargeStub = cardPaymentStubs.buildCancelChargeStub(chargeId)

describe('Cancelling payment from card details page', () => {
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

  it('Show show the cancel page', () => {
    cy.task('setupStubs', createCancelChargeStub)

    cy.get('#cancel').submit()
    cy.get('h1.user-cancel').should('exist')
    cy.get('h1.user-cancel').should('contain', 'Your payment has been cancelled')
  })
})
