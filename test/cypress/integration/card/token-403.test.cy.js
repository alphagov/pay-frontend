const cardPaymentStubs = require('../../utils/card-payment-stubs')

describe('Re-using token results in 403 flow', () => {
  const tokenId = 'be88a908-3b99-4254-9807-c855d53f6b2b'
  const chargeId = 'ub8de8r5mh4pb49rgm1ismaqfv'
  const usedTokenAndReturnPaymentCreatedChargeStubs = cardPaymentStubs.buildUsedTokenAndReturnPaymentChargeStubs(tokenId, chargeId, 'ENTERING CARD DETAILS')
  const returnNotFound = cardPaymentStubs.buildChargeFromTokenNotFound(tokenId)

  beforeEach(() => {
    cy.clearCookies()
  })

  describe('Visiting the secure url when payment is not in cookie', () => {
    it('should show the "Your payment session has expired" page', () => {
      cy.task('setupStubs', usedTokenAndReturnPaymentCreatedChargeStubs)
      cy.visit(`/secure/${tokenId}`, { failOnStatusCode: false })
      cy.location('pathname').should('eq', `/secure/${tokenId}`)
      cy.get('h1').should('contain', 'Your payment session has expired')
      cy.get('#return-url').should('not.exist')
      cy.percySnapshot()
    })
  })

  describe('Visiting the secure url when token doesn\'t exist', () => {
    it('should show the "Your payment session has expired" page', () => {
      cy.task('setupStubs', returnNotFound)
      cy.visit(`/secure/${tokenId}`, { failOnStatusCode: false })
      cy.location('pathname').should('eq', `/secure/${tokenId}`)
      cy.get('h1').should('contain', 'Your payment session has expired')
      cy.get('#return-url').should('not.exist')
      cy.percySnapshot()
    })
  })
})
