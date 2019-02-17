describe('Standard card payment flow', () => {
  // @TODO(sfount) charge id should be driven by external id exposed through toke fixture
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

  // @TODO(sfount) return url will need to accept the port of the running server
  // @TODO(sfount) when making fixtures for charges include the return URL that you expect to successfully test against
  const createPaymentChargeStubs = [
    { name: 'getValidChargeCreated', opts: { tokenId } },
    { name: 'getValidTokenDeleted', opts: { tokenId } },
    { name: 'getValidInitialCharge', opts: { chargeId } },
    { name: 'putValidInitialChargeStatus', opts: { chargeId } },

    // note this should pass the service to be queried relative to the charge
    // right now it just returns a default service
    { name: 'getValidInitialService', opts: {} }
  ]

  const checkCardDetailsStubs = [
    { name: 'getValidEnteringCardDetailsCharge', opts: { chargeId } },
    { name: 'getValidCardDetails', opts: {} }
  ]

  // @TODO(sfount) test the payment in progress in flows by returning statuses that indicate different levels of progress
  // i.e - charge after or before authorisation when clicking confirm should bring up confirmation page or 'your payment is in progress' page respectively
  const confirmPaymentDetailsStubs = [
    // { name: 'getValidEnteringCardDetailsCharge', opts: { chargeId } },
    { name: 'getValidChargeDetailsForConfirmation', opts: { chargeId } },
    { name: 'getValidCardDetails', opts: {} },

    // @NOTE(sfount) as this is a new request admin users will be requested for service details
    { name: 'getValidInitialService', opts: {} },
    { name: 'patchValidConfirmChargeDetails', opts: { chargeId } }
  ]

  const submitPaymentCaptureStubs = [
    { name: 'getValidChargeDetailsForCaptureSubmission', opts: { chargeId } },
    { name: 'postValidCaptureCharge', opts: { chargeId } }
  ]

  beforeEach(() => {
    /* cy.task('setupStubs', [
      { name: 'getValidChargeCreated', opts: { tokenId } },
      { name: 'getValidTokenDeleted', opts: { tokenId } },
      { name: 'getValidCharges', opts: { chargeId } },
      { name: 'putValidInitialChargeStatus', opts: { chargeId } },

      // note this should pass the service to be queried relative to the charge
      // right now it just returns a default service
      { name: 'getValidInitialService', opts: {} },
      { name: 'getValidCardDetails', opts: {} }
    ])*/

    // this test is for the full process, the session should be maintained
    // as it would for an actual payment flow
    Cypress.Cookies.preserveOnce('frontend_state')
  })

  describe('Secure card payment page', () => {
    it('Should setup the payment and load the page', () => {
      cy.task('setupStubs', createPaymentChargeStubs)
      // cy.task('setupStubs', defaultStubs.concat([
      // { name: 'getValidInitialCharge', opts: { chargeId } }
      // ]))
      // cy.server()
      // cy.route('POST', `/check_card/${chargeId}`).as('checkCard')

      cy.visit(`/secure/${tokenId}`)
      // The following expected behaviours should be triggered
      // 1. Charge will be created using this id as a token (GET)
      // 2. Token will be deleted (DELETE)
      // 3. Charge will be fetched (GET)
      // 4. Service related to charge will be fetched (GET)
      // 5. Charge status will be updated (PUT)
      // 5. Client will be redirected to /card_details/:chargeId (304)
      cy.location('pathname').should('eq', `/card_details/${chargeId}`)

      // card details are verified with Frontend
      // cy.get('#card-no').type(validPayment.cardNumber)
      // cy.get('#card-no').blur()

      // cy.wait('@checkCard')

      // 6. Charge status will be fetched (GET)
      // 7. CardID POST to verify that entered card is correct - this is configured to return valid

      // cy.get('#card-no').should('not.have.class', 'govuk-input--error')

      // cy.log(cy.getCookies())
      cy.getCookies({ log: true })
    })

    it('Should enter and validate a correct card', () => {
      cy.task('setupStubs', checkCardDetailsStubs)
      // @TODO(sfount) set cookies as if they had been agreed according to
      // reqeuesting charge ID through visiting /secure
      // cy.sessionCookie(chargeId)
      // cy.visit(`/secure/${tokenId}`)

      // @TODO(steps): Friday
      // 1. Stub out final confirm page
      // 2. Stub out success response
      // 3. Remove huge duplication from fixtures that report on card details
      //    (remove as much detail from these as possible without frontend breaking)
      // 4. PR with Cypress testing on core Fixtures
      // 5. Get Cookie setting code to work
      // -> -> -> use 'Preserve Once' with a TODO https://docs.cypress.io/api/cypress-api/cookies.html#Preserve-Once
      // -> Figure out exactly what cookies it will expect (including potential csrf)
      // -> Debug Cookie being set correctly
      // -> Re-factor to include setting the cookie instead of re-setting the page
      // 6. Investigate Pacts in self service
      // 7. Write Pacts for some of the core card payment flows

      // cy.visit(`/card_details/ub8de8r5mh4pb49rgm1ismaqfv`)
      // cy.task('setupStubs', defaultStubs.concat([
      //   { name: 'getValidInitialCharge', opts: { chargeId } }
      // ]))
      // cy.task('setupStubs', defaultStubs.concat([
      //   { name: 'getValidInitialCharge', opts: { chargeId } }
      // ]))
      cy.getCookies({ log: true })
      cy.server()
      cy.route('POST', `/check_card/${chargeId}`).as('checkCard')

      cy.get('#card-no').type(validPayment.cardNumber)
      cy.get('#card-no').blur()

      cy.wait('@checkCard')
      cy.get('#card-no').should('not.have.class', 'govuk-input--error')

      // cy.get('#card-no').type(validPayment.cardNumber)
      // cy.get('#card-no').blur()
    })

    it('Should enter payment details', () => {
      cy.getCookies({ log: true })
      cy.get('#expiry-month').type(validPayment.expiryMonth)
      cy.get('#expiry-year').type(validPayment.expiryYear)
      cy.get('#cardholder-name').type(validPayment.name)
      cy.get('#cvc').type(validPayment.securityCode)
      cy.get('#address-line-1').type(validPayment.addressLine1)
      cy.get('#address-city').type(validPayment.city)
      cy.get('#address-postcode').type(validPayment.postcode)
      cy.get('#email').type(validPayment.email)
    })
  })

  // should have the stub for getValidChargeDetailsAfterAuthorisation
  describe('Secure confirmation page', () => {
    it('Submitting confirmation with valid details should redirect to confirmation page', () => {
      const lastFourCardDigits = validPayment.cardNumber.substr(-4)

      cy.task('setupStubs', confirmPaymentDetailsStubs)

      cy.get('#card-details').submit()

      // 8. Charge status will be fetched - this will report the same as earlier as nothing has changed (GET)
      // 9. CardID POST to verify that entered card is correct - this shouldn't have changed from earlier (POST)
      // 10. Update charge details on Connector with valid card details (PATCH)
      // 11. Create actual charge for the card details on Connector (expects success message) (POST)
      // 12. Get charge status after authorisation (GET)
      cy.location('pathname').should('eq', `/card_details/${chargeId}/confirm`)
      cy.get('#card-number').should(($td) => {
        // TD inner value is paded with white space - generic match
        expect($td).to.contain(`************${lastFourCardDigits}`)
      })
      cy.get('#cardholder-name').should(($td) => expect($td).to.contain(validPayment.name))
      cy.get('#email').should(($td) => expect($td).to.contain(validPayment.email))
    })
  })

  describe('Secure payment submission', () => {
    it('Confirming payment should successfully redirect to configured next_url', () => {
      cy.task('setupStubs', submitPaymentCaptureStubs)

      console.log(Cypress.env())
      cy.get('#confirm').click()
      // 13. Get charge status before continuing - should be the same as authorised success (GET)
      // 14. Post to connector capture route (POST)
      // 15. Get charge status following post - should show capture success (GET)

      cy.location('pathname').should('eq', `/`)
      cy.location('search').should('eq', `?confirm`)
    })
  })
})
