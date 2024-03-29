const cardPaymentStubs = require('../../utils/card-payment-stubs')

describe('Re-use token flow', () => {
  const tokenId = 'be88a908-3b99-4254-9807-c855d53f6b2b'
  const chargeId = 'ub8de8r5mh4pb49rgm1ismaqfv'
  const createPaymentChargeStubs = cardPaymentStubs.buildCreatePaymentChargeStubs(tokenId, chargeId)
  const usedTokenAndReturnPaymentCreatedChargeStubs = cardPaymentStubs.buildUsedTokenAndReturnPaymentChargeStubs(tokenId, chargeId, 'ENTERING CARD DETAILS')
  const usedTokenAndReturnPaymentAuthSuccessChargeStubs = cardPaymentStubs.buildUsedTokenAndReturnPaymentChargeStubs(tokenId, chargeId, 'AUTHORISATION SUCCESS')
  const usedTokenAndReturnPaymentExpiredChargeStubs = cardPaymentStubs.buildUsedTokenAndReturnPaymentChargeStubs(tokenId, chargeId, 'EXPIRED')
  const checkCardDetailsStubs = cardPaymentStubs.checkCardDetailsStubs(chargeId)

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

  const confirmPaymentDetailsStubs = cardPaymentStubs.confirmPaymentDetailsStubs(chargeId, validPayment)

  describe('Token reuse', () => {
    it('Should display the payment screen in the right state when visiting it with token IDs that are in different states', () => {
      cy.task('setupStubs', createPaymentChargeStubs)
      cy.visit(`/secure/${tokenId}`)

      cy.log('Should load the Enter Card Details page when visiting the secure url for the first time')

      // 1. Charge will be created using this id as a token (GET)
      // 2. Token will be marked as used (POST)
      // 3. Charge will be fetched (GET)
      // 4. Service related to charge will be fetched (GET)
      // 5. Charge status will be updated (PUT)
      // 6. Client will be redirected to /card_details/:chargeId (304)
      cy.location('pathname').should('eq', `/card_details/${chargeId}`)

      cy.task('clearStubs')
      cy.task('setupStubs', usedTokenAndReturnPaymentCreatedChargeStubs)

      cy.visit(`/secure/${tokenId}`)

      // 1. Charge will be created using this id as a token (GET)
      // 2. Token will be marked as used (POST)
      // 3. Charge will be fetched (GET)
      // 4. Service related to charge will be fetched (GET)
      // 5. Charge status will be updated (PUT)
      // 6. Client will be redirected to /card_details/:chargeId (304)
      cy.location('pathname').should('eq', `/secure/${tokenId}`)

      cy.log('Should load the "Your payment is in progress" page with a link to the "Enter card details" page when visiting the secure url again and state is ENTERING CARD DETAILS')

      cy.get('#card-details-link').should(($a) => expect($a).to.contain('Continue with your payment'))
      cy.get('#card-details-link').should(($a) => expect($a).to.have.attr('href', `/card_details/${chargeId}`))
      cy.get('#return-url').should(($a) => expect($a).to.contain('Cancel and go back to try the payment again'))
      cy.get('#return-url').should(($a) => expect($a).to.have.attr('href', `/return/${chargeId}`))

      cy.get('#card-details-link').click()

      cy.location('pathname').should('eq', `/card_details/${chargeId}`)

      cy.task('clearStubs')
      cy.task('setupStubs', checkCardDetailsStubs)

      cy.intercept('POST', `/check_card/${chargeId}`).as('checkCard')

      cy.log('Should allow entering payment details')

      cy.get('#card-no').type(validPayment.cardNumber)
      cy.get('#card-no').blur()

      // 7. Charge status will be fetched (GET)
      // 8. CardID POST to verify that entered card is correct - this is configured to return valid
      cy.wait('@checkCard')
      cy.get('#card-no').should('not.have.class', 'govuk-input--error')

      cy.get('#expiry-month').type(validPayment.expiryMonth)
      cy.get('#expiry-year').type(validPayment.expiryYear)
      cy.get('#cardholder-name').type(validPayment.name)
      cy.get('#cvc').type(validPayment.securityCode)
      cy.get('#address-line-1').type(validPayment.addressLine1)
      cy.get('#address-city').type(validPayment.city)
      cy.get('#address-postcode').type(validPayment.postcode)
      cy.get('#email').type(validPayment.email)

      cy.task('clearStubs')
      cy.task('setupStubs', confirmPaymentDetailsStubs)

      cy.get('#card-details').submit()

      const lastFourCardDigits = validPayment.cardNumber.substr(-4)

      // 9. Charge status will be fetched - this will report the same as earlier as nothing has changed (GET)
      // 10. CardID POST to verify that entered card is correct - this shouldn't have changed from earlier (POST)
      // 11. Update charge details on Connector with valid card details (PATCH)
      // 12. Create actual charge for the card details on Connector (expects success message) (POST)
      // 13. Get charge status after authorisation (GET)

      cy.log('Should show the Confirm Your Payment page')

      cy.location('pathname').should('eq', `/card_details/${chargeId}/confirm`)

      // TD inner values are padded with white space - generic match
      cy.get('#card-number').should(($td) => expect($td).to.contain(`●●●●●●●●●●●●${lastFourCardDigits}`))
      cy.get('#cardholder-name').should(($td) => expect($td).to.contain(validPayment.name))
      cy.get('#email').should(($td) => expect($td).to.contain(validPayment.email))

      cy.task('clearStubs')
      cy.task('setupStubs', usedTokenAndReturnPaymentAuthSuccessChargeStubs)
      cy.visit(`/secure/${tokenId}`)

      cy.location('pathname').should('eq', `/secure/${tokenId}`)

      cy.log('Should show the "Your Payment Is In Progress" page with a link to the "Confirm your payment" page when visiting the secure url again and state is AUTHORISATION SUCCESS')

      cy.get('#confirm-link').should(($a) => expect($a).to.contain('Continue with your payment'))
      cy.get('#confirm-link').should(($a) => expect($a).to.have.attr('href', `/card_details/${chargeId}/confirm`))
      cy.get('#return-url').should(($a) => expect($a).to.contain('Cancel and go back to try the payment again'))
      cy.get('#return-url').should(($a) => expect($a).to.have.attr('href', `/return/${chargeId}`))

      cy.get('#confirm-link').click()

      cy.task('clearStubs')
      cy.task('setupStubs', usedTokenAndReturnPaymentExpiredChargeStubs)

      cy.log('Should show the "Your payment session has expired" page when visiting the secure url again when state is EXPIRED')

      cy.visit(`/secure/${tokenId}`)
      cy.location('pathname').should('eq', `/secure/${tokenId}`)
      cy.get('h1').should('contain', 'Your payment session has expired')
    })
  })
})
