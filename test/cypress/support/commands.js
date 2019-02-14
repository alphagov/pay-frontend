Cypress.Commands.add('sessionCookie', (chargeId) => {
  cy.task('generateSessionCookie', chargeId)
    .then((cookie) => {

      console.log('got cookie', cookie)
      cy.setCookie('frontend_state', cookie)
    })
})
