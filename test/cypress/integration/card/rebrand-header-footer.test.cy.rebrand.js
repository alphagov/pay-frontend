const cardPaymentStubs = require('../../utils/card-payment-stubs')

describe('Rebrand', () => {
  const tokenId = 'be88a908-3b99-4254-9807-c855d53f6b2b'
  const chargeId = 'ub8de8r5mh4pb49rgm1ismaqfv'
  const language = 'en'

  it('should display the header and footer with new branding when ENABLE_REBRAND = true', () => {
    cy.task('setupStubs', cardPaymentStubs.buildCreatePaymentChargeStubs(tokenId, chargeId, language))
    cy.visit(`/secure/${tokenId}`)

    cy.log('Should display the header with new branding')

    cy.get('[data-cy=header]').should('have.css', 'background-color', 'rgb(29, 112, 184)')
    cy.get('[data-cy=header]').should('have.css', 'color', 'rgb(255, 255, 255)')
    cy.get('[data-cy=header]')
      .find('.govuk-header__container')
      .should('have.css', 'border-bottom-color', 'rgb(255, 255, 255)')

    cy.log('Should display the footer with new branding')

    cy.get('[data-cy=footer]')
      .should('have.css', 'background-color', 'rgb(244, 248, 251)')
      .should('have.css', 'border-top-color', 'rgb(29, 112, 184)')
  })
})
