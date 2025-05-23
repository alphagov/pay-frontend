const cardPaymentStubs = require('../../utils/card-payment-stubs')

const tokenId = 'be88a908-3b99-4254-9807-c855d53f6b2b'
const chargeId = 'ub8de8r5mh4pb49rgm1ismaqfv'

describe('Custom branding', () => {
  it('Should setup custom branding correctly when white background with dark text', () => {
    cy.task('clearStubs')
    const createPaymentChargeStubs = cardPaymentStubs.buildCreatePaymentChargeStubs(
      tokenId,
      chargeId,
      'en',
      101,
      {
        custom_branding: {
          image_url: '/public/images/custom/cypress-testing.svg',
          css_url: '/public/stylesheets/custom/cypress-testing-white-background.min.css'
        }
      }
    )

    cy.task('setupStubs', createPaymentChargeStubs)
    cy.visit(`/secure/${tokenId}`)

    cy.location('pathname').should('eq', `/card_details/${chargeId}`)

    cy.get('[data-cy=header]').should('have.css', 'background-color', 'rgb(255, 255, 255)')
    cy.get('[data-cy=header-container]').should('have.css', 'border-bottom-color', 'rgb(0, 0, 0)')

    cy.get('[data-cy=header-container]')
      .should('have.css', 'border-bottom-color', 'rgb(0, 0, 0)')
      .and('have.css', 'border-bottom-width')
      .then((borderWidth) => {
        expect(borderWidth).not.to.eq('0px')
      })

    cy.get('[data-cy=service-name]').should('have.css', 'color', 'rgb(0, 0, 0)')
    cy.get('[data-cy=custom-branding-image-container]').should('have.css', 'background-color', 'rgba(0, 0, 0, 0)')
    cy.get('[data-cy=custom-branding-image]').should('have.attr', 'src', '/public/images/custom/cypress-testing.svg')
  })

  it('Should setup custom branding correctly when purple background with white text', () => {
    cy.task('clearStubs')
    const createPaymentChargeStubs = cardPaymentStubs.buildCreatePaymentChargeStubs(
      tokenId,
      chargeId,
      'en',
      102,
      {
        custom_branding: {
          image_url: '/public/images/custom/cypress-testing.svg',
          css_url: '/public/stylesheets/custom/cypress-testing-purple-background.min.css'
        }
      }
    )

    cy.task('setupStubs', createPaymentChargeStubs)
    cy.visit(`/secure/${tokenId}?date=` + Date.now())

    cy.location('pathname').should('eq', `/card_details/${chargeId}`)

    cy.get('[data-cy=header]').should('have.css', 'background-color', 'rgb(191, 64, 191)')
    cy.get('[data-cy=header-container]').should('have.css', 'border-bottom-color', 'rgb(0, 0, 0)')

    cy.get('[data-cy=header-container]')
      .should('have.css', 'border-bottom-color', 'rgb(0, 0, 0)')
      .and('have.css', 'border-bottom-width')
      .then((borderWidth) => {
        expect(borderWidth).not.to.eq('0px')
      })

    cy.get('[data-cy=service-name]').should('have.css', 'color', 'rgb(255, 255, 255)')
    cy.get('[data-cy=custom-branding-image-container]').should('have.css', 'background-color', 'rgba(0, 0, 0, 0)')
    cy.get('[data-cy=custom-branding-image]').should('have.attr', 'src', '/public/images/custom/cypress-testing.svg')
  })
})
