const cardPaymentStubs = require('../../utils/card-payment-stubs')

describe('Standard card payment flow', () => {
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

  const createPaymentChargeStubsEnglish = cardPaymentStubs.buildCreatePaymentChargeStubs(tokenId, chargeId, 'en')
  const createPaymentChargeStubsWelsh = cardPaymentStubs.buildCreatePaymentChargeStubs(tokenId, chargeId, 'cy')

  const checkCardDetailsStubs = [
    { name: 'connectorGetChargeDetails',
      opts: {
        chargeId,
        status: 'ENTERING CARD DETAILS',
        state: { finished: false, status: 'started' }
      }
    },
    { name: 'cardIdValidCardDetails' }
  ]

  // @TODO(sfount) test the payment in progress in flows by returning statuses that indicate different levels of progress
  // i.e - charge after or before authorisation when clicking confirm should bring up confirmation page or 'your payment is in progress' page respectively
  const confirmPaymentDetailsStubs = [
    { name: 'adminUsersGetService', opts: {} },
    { name: 'connectorMultipleSubsequentChargeDetails',
      opts: [{
        chargeId,
        status: 'ENTERING CARD DETAILS',
        state: { finished: false, status: 'started' }
      }, {
        chargeId,
        paymentDetails: validPayment,
        status: 'AUTHORISATION SUCCESS',
        state: { finished: false, status: 'submitted' }
      }]
    },
    { name: 'cardIdValidCardDetails' },
    { name: 'connectorValidPatchConfirmedChargeDetails', opts: { chargeId } }
  ]

  const submitPaymentCaptureStubs = [
    { name: 'connectorMultipleSubsequentChargeDetails',
      opts: [{
        chargeId,
        paymentDetails: validPayment,
        status: 'AUTHORISATION SUCCESS',
        state: { finished: false, status: 'submitted' }
      }, {
        chargeId,
        paymentDetails: validPayment,
        status: 'CAPTURE APPROVED',
        state: { finished: true, status: 'success' }
      }]
    },
    { name: 'connectorPostValidChargeCardDetailsAuthorisation', opts: { chargeId } },
    { name: 'connectorPostValidCaptureCharge', opts: { chargeId } }
  ]

  beforeEach(() => {
    // this test is for the full process, the session should be maintained
    // as it would for an actual payment flow
    Cypress.Cookies.preserveOnce('frontend_state')
  })

  describe('Secure card payment page', () => {
    it('Should setup the payment and load the page', () => {
      cy.task('setupStubs', createPaymentChargeStubsEnglish)
      cy.visit(`/secure/${tokenId}`)

      // 1. Charge will be created using this id as a token (GET)
      // 2. Token will be deleted (DELETE)
      // 3. Charge will be fetched (GET)
      // 4. Service related to charge will be fetched (GET)
      // 5. Charge status will be updated (PUT)
      // 6. Client will be redirected to /card_details/:chargeId (304)
      cy.location('pathname').should('eq', `/card_details/${chargeId}`)
    })

    it('Should enter and validate a correct card', () => {
      cy.task('setupStubs', checkCardDetailsStubs)

      cy.server()
      cy.route('POST', `/check_card/${chargeId}`).as('checkCard')

      cy.get('#card-no').type(validPayment.cardNumber)
      cy.get('#card-no').blur()

      // 7. Charge status will be fetched (GET)
      // 8. CardID POST to verify that entered card is correct - this is configured to return valid
      cy.wait('@checkCard')
      cy.get('#card-no').should('not.have.class', 'govuk-input--error')
    })

    it('Should enter payment details', () => {
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

  describe('Secure confirmation page', () => {
    it('Submitting confirmation with valid details should redirect to confirmation page', () => {
      const lastFourCardDigits = validPayment.cardNumber.substr(-4)

      cy.task('setupStubs', confirmPaymentDetailsStubs)
      cy.get('#card-details').submit()

      // 9. Charge status will be fetched - this will report the same as earlier as nothing has changed (GET)
      // 10. CardID POST to verify that entered card is correct - this shouldn't have changed from earlier (POST)
      // 11. Update charge details on Connector with valid card details (PATCH)
      // 12. Create actual charge for the card details on Connector (expects success message) (POST)
      // 13. Get charge status after authorisation (GET)
      cy.location('pathname').should('eq', `/card_details/${chargeId}/confirm`)

      // TD inner values are padded with white space - generic match
      cy.get('#card-number').should(($td) => expect($td).to.contain(`************${lastFourCardDigits}`))
      cy.get('#cardholder-name').should(($td) => expect($td).to.contain(validPayment.name))
      cy.get('#email').should(($td) => expect($td).to.contain(validPayment.email))
    })
  })

  describe('Secure payment submission', () => {
    it('Confirming payment should successfully redirect to configured next_url', () => {
      cy.task('setupStubs', submitPaymentCaptureStubs)

      cy.get('#confirm').click()

      // 14. Get charge status before continuing - should be the same as authorised success (GET)
      // 15. Post to connector capture route (POST)
      // 16. Get charge status following post - should show capture success (GET)
      cy.location('pathname').should('eq', `/`)
      cy.location('search').should('eq', `?confirm`)
    })
  })

  describe('Secure card payment page should show error', () => {
    it('Should setup the payment and load the page', () => {
      cy.task('setupStubs', createPaymentChargeStubsEnglish)
      cy.visit(`/secure/${tokenId}`)

      // 1. Charge will be created using this id as a token (GET)
      // 2. Token will be deleted (DELETE)
      // 3. Charge will be fetched (GET)
      // 4. Service related to charge will be fetched (GET)
      // 5. Charge status will be updated (PUT)
      // 6. Client will be redirected to /card_details/:chargeId (304)
      cy.location('pathname').should('eq', `/card_details/${chargeId}`)
    })

    it('Should show error when card number is less than 11 digits', () => {
      cy.task('setupStubs', checkCardDetailsStubs)

      cy.server()
      cy.route('POST', `/check_card/${chargeId}`).as('checkCard')

      cy.get('#card-no').type('1234567890')
      cy.get('#card-no').blur()

      cy.get('#card-no').should('have.class', 'govuk-input--error')
      cy.get('#card-no-lbl').should('contain', 'Card number is not the correct length')
    })
  })

  describe('Secure card payment page should show error', () => {
    it('Should setup the payment and load the page', () => {
      cy.task('setupStubs', createPaymentChargeStubsWelsh)
      cy.visit(`/secure/${tokenId}`)

      // 1. Charge will be created using this id as a token (GET)
      // 2. Token will be deleted (DELETE)
      // 3. Charge will be fetched (GET)
      // 4. Service related to charge will be fetched (GET)
      // 5. Charge status will be updated (PUT)
      // 6. Client will be redirected to /card_details/:chargeId (304)
      cy.location('pathname').should('eq', `/card_details/${chargeId}`)
    })

    it('Should show error when card number is less than 11 digits', () => {
      cy.task('setupStubs', checkCardDetailsStubs)

      cy.server()
      cy.route('POST', `/check_card/${chargeId}`).as('checkCard')

      cy.get('#card-no').type('1234567890')
      cy.get('#card-no').blur()

      cy.get('#card-no').should('have.class', 'govuk-input--error')
      cy.get('#card-no-lbl').should('contain', 'Nid yw rhif y cerdyn yr hyd cywir')
    })
  })
})
