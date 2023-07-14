const cardPaymentStubs = require('../../utils/card-payment-stubs')

const tokenId = 'be88a908-3b99-4254-9807-c855d53f6b2b'
const chargeId = 'ub8de8r5mh4pb49rgm1ismaqfv'
const createPaymentChargeStubs = cardPaymentStubs.buildCreatePaymentChargeStubs(tokenId, chargeId, 'en')

describe('Card details page validation', () => {
  it('Should setup the payment and validate the fields correctly', () => {
    cy.task('setupStubs', createPaymentChargeStubs)
    cy.visit(`/secure/${tokenId}`)

    cy.location('pathname').should('eq', `/card_details/${chargeId}`)
    cy.window().its('chargeId').should('eq', `${chargeId}`)

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

  it('Should perform inline validation of the expiry date correctly', () => {
    cy.task('setupStubs', createPaymentChargeStubs)
    cy.visit(`/secure/${tokenId}`)

    cy.get('[data-cy=expiry-month]').type('01')
    cy.get('[data-cy=expiry-year]').type('23')
    cy.get('[data-cy=cardholder-name]').click()
    cy.get('[data-cy=expiry-month]').should('have.class', 'govuk-input--error')
    cy.get('[data-cy=expiry-year]').should('have.class', 'govuk-input--error')

    const nextYearIn2Digits = (new Date().getFullYear() + 1).toString().slice(-2)

    cy.get('[data-cy=expiry-year]').clear().type(nextYearIn2Digits)
    cy.get('[data-cy=cardholder-name]').click()

    cy.get('[data-cy=expiry-month]').not('have.class', 'govuk-input--error')
    cy.get('[data-cy=expiry-year]').not('have.class', 'govuk-input--error')
  })
})
