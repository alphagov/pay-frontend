Cypress.Commands.add('sessionCookie', (chargeId) => {
  cy.task('generateSessionCookie', chargeId)
    .then((cookie) => {
      cy.setCookie('frontend_state', cookie)
    })
})
