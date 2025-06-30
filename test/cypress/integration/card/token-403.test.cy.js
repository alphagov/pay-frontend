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
    it('should show the "Your payment session has expired" page with the header and footer styled correctly', () => {
      cy.task('setupStubs', usedTokenAndReturnPaymentCreatedChargeStubs)
      cy.visit(`/secure/${tokenId}`, { failOnStatusCode: false })
      cy.location('pathname').should('eq', `/secure/${tokenId}`)

      cy.log('Should display the GOV.UK header correctly')

      cy.get('[data-cy=header]').should('have.css', 'background-color', 'rgb(29, 112, 184)')
      cy.get('[data-cy=header]').should('have.css', 'color', 'rgb(255, 255, 255)')
      cy.get('[data-cy=header]')
        .find('.govuk-header__container')
        .should('have.css', 'border-bottom-color', 'rgb(255, 255, 255)')

      cy.log('Should display the GOV.UK footer correctly')

      cy.get('[data-cy=footer]')
        .should('have.css', 'background-color', 'rgb(244, 248, 251)')
        .should('have.css', 'border-top-color', 'rgb(29, 112, 184)')

      cy.get('h1').should('contain', 'Your payment session has expired')
      cy.get('#return-url').should('not.exist')
    })
  })

  describe('Visiting the secure url when token doesn\'t exist', () => {
    it('should show the "Your payment session has expired" page', () => {
      cy.task('setupStubs', returnNotFound)
      cy.visit(`/secure/${tokenId}`, { failOnStatusCode: false })
      cy.location('pathname').should('eq', `/secure/${tokenId}`)
      cy.get('h1').should('contain', 'Your payment session has expired')
      cy.get('#return-url').should('not.exist')
    })
  })
})
