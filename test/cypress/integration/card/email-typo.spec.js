const cardPaymentStubs = require('../../utils/card-payment-stubs')
const { getMockApplePayClass } = require('../../utils/apple-pay-js-api-stubs')
const lodash = require('lodash')

describe('Standard card payment flow', () => {
  const tokenId = 'be88a908-3b99-4254-9807-c855d53f6b2b'
  const chargeId = 'ub8de8r5mh4pb49rgm1ismaqfv'

  const likelyTypoEmail = 'validpayingemail@gnail.com'
  const likelyDoubleTypoEmail = 'vaildpyingenail@gnail.com'
  const likelyDoubleTypoEmailFix = 'vaildpyingenail@gmail.com'
  const validPayment = {
    cardNumber: '4444333322221111',
    expiryMonth: '01',
    expiryYear: '30',
    name: 'Valid Paying Name',
    securityCode: '012',
    addressLine1: '10 Valid Paying Address',
    city: 'London',
    postcode: 'E1 8QS',
    email: 'validpayingemail@gmail.com'
  }

  const createPaymentChargeStubs = cardPaymentStubs.buildCreatePaymentChargeStubs(tokenId, chargeId)

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
  const confirmPaymentDetailsStubs = function (email) {
    const alteredValidPayment = lodash.cloneDeep(validPayment)
    alteredValidPayment.email = email
    return [
      { name: 'adminUsersGetService', opts: {} },
      { name: 'connectorMultipleSubsequentChargeDetails',
        opts: [{
          chargeId,
          status: 'ENTERING CARD DETAILS',
          state: { finished: false, status: 'started' }
        }, {
          chargeId,
          paymentDetails: alteredValidPayment,
          status: 'AUTHORISATION SUCCESS',
          state: { finished: false, status: 'submitted' }
        }]
      },
      { name: 'cardIdValidCardDetails' },
      { name: 'connectorValidPatchConfirmedChargeDetails', opts: { chargeId } }
    ]
  }

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
      cy.task('setupStubs', createPaymentChargeStubs)
      // Stubbing for Apple Pay to test this works even if Apple/Google Pay are enabled. Because we don’t want it popping up when it’s reloaded to show the typo error message
      cy.visit(`/secure/${tokenId}`, {
        onBeforeLoad: win => {
          // Stub Apple Pay API (which only exists within Safari)
          win.ApplePaySession = getMockApplePayClass(likelyDoubleTypoEmailFix)
        }
      })

      // 1. Charge will be created using this id as a token (GET)
      // 2. Token will be deleted (DELETE)
      // 3. Charge will be fetched (GET)
      // 4. Service related to charge will be fetched (GET)
      // 5. Charge status will be updated (PUT)
      // 6. Client will be redirected to /card_details/:chargeId (304)
      cy.location('pathname').should('eq', `/card_details/${chargeId}`)
    })

    it('Should enter valid payment details but bad email', () => {
      cy.task('setupStubs', checkCardDetailsStubs)
      cy.get('#card-no').type(validPayment.cardNumber)
      cy.server()
      cy.route('POST', `/check_card/${chargeId}`).as('checkCard')
      cy.get('#expiry-month').type(validPayment.expiryMonth)
      cy.get('#expiry-year').type(validPayment.expiryYear)
      cy.get('#cardholder-name').type(validPayment.name)
      cy.get('#cvc').type(validPayment.securityCode)
      cy.get('#address-line-1').type(validPayment.addressLine1)
      cy.get('#address-city').type(validPayment.city)
      cy.get('#address-postcode').type(validPayment.postcode)
      cy.get('#email').type(likelyTypoEmail)
    })
  })

  describe('Redirect back to enter card details page', () => {
    it('Should show error about email typo', () => {
      cy.task('setupStubs', confirmPaymentDetailsStubs(validPayment.email))
      cy.get('#card-details').submit()

      // 7. Page redirects to itself highlighting the typo and suggesting a fix
      cy.location('pathname').should('eq', `/card_details/${chargeId}`)

      cy.get('#error-summary').should('be.visible')
      cy.get('label[for="email-corrected"]').should('contain', validPayment.email)
    })
  })

  describe('Secure confirmation page', () => {
    it('Submitting confirmation with valid details should redirect to confirmation page and suggested email correction', () => {
      const lastFourCardDigits = validPayment.cardNumber.substr(-4)

      cy.task('setupStubs', confirmPaymentDetailsStubs(validPayment.email))
      cy.get('#card-details').submit()

      // 8. Charge status will be fetched - this will report the same as earlier as nothing has changed (GET)
      // 9. CardID POST to verify that entered card is correct - this shouldn't have changed from earlier (POST)
      // 10. Update charge details on Connector with valid card details (PATCH)
      // 11. Create actual charge for the card details on Connector (expects success message) (POST)
      // 12. Get charge status after authorisation (GET)
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

      // 13. Get charge status before continuing - should be the same as authorised success (GET)
      // 14. Post to connector capture route (POST)
      // 15. Get charge status following post - should show capture success (GET)
      cy.location('pathname').should('eq', `/`)
      cy.location('search').should('eq', `?confirm`)
    })
  })

  describe('Secure card payment page', () => {
    it('Should setup the payment and load the page', () => {
      cy.task('setupStubs', createPaymentChargeStubs)
      cy.visit(`/secure/${tokenId}`)

      // 1. Charge will be created using this id as a token (GET)
      // 2. Token will be deleted (DELETE)
      // 3. Charge will be fetched (GET)
      // 4. Service related to charge will be fetched (GET)
      // 5. Charge status will be updated (PUT)
      // 6. Client will be redirected to /card_details/:chargeId (304)
      cy.location('pathname').should('eq', `/card_details/${chargeId}`)
    })

    it('Should enter valid payment details but what looks like a suspect email', () => {
      cy.task('setupStubs', checkCardDetailsStubs)
      cy.get('#card-no').type(validPayment.cardNumber)
      cy.server()
      cy.route('POST', `/check_card/${chargeId}`).as('checkCard')
      cy.get('#expiry-month').type(validPayment.expiryMonth)
      cy.get('#expiry-year').type(validPayment.expiryYear)
      cy.get('#cardholder-name').type(validPayment.name)
      cy.get('#cvc').type(validPayment.securityCode)
      cy.get('#address-line-1').type(validPayment.addressLine1)
      cy.get('#address-city').type(validPayment.city)
      cy.get('#address-postcode').type(validPayment.postcode)
      cy.get('#email').type(likelyTypoEmail)
    })
  })

  describe('Redirect back to enter card details page', () => {
    it('Should show error about email typo', () => {
      cy.task('setupStubs', confirmPaymentDetailsStubs(likelyTypoEmail))
      cy.get('#card-details').submit()

      // 7a. Page redirects to itself highlighting the typo and suggesting a fix
      cy.location('pathname').should('eq', `/card_details/${chargeId}`)

      cy.get('#error-summary').should('be.visible')
      cy.get('label[for="email-uncorrected"]').should('contain', likelyTypoEmail)
      // 7b. which the user chooses to ignore
      cy.get('#email-uncorrected').click()
    })
  })

  describe('Secure confirmation page', () => {
    it('Submitting confirmation with valid details should redirect to confirmation page and user should use uncorrected email address', () => {
      const lastFourCardDigits = validPayment.cardNumber.substr(-4)

      cy.task('setupStubs', confirmPaymentDetailsStubs(likelyTypoEmail))
      cy.get('#card-details').submit()

      // 8. Charge status will be fetched - this will report the same as earlier as nothing has changed (GET)
      // 9. CardID POST to verify that entered card is correct - this shouldn't have changed from earlier (POST)
      // 10. Update charge details on Connector with valid card details (PATCH)
      // 11. Create actual charge for the card details on Connector (expects success message) (POST)
      // 12. Get charge status after authorisation (GET)
      cy.location('pathname').should('eq', `/card_details/${chargeId}/confirm`)

      // TD inner values are padded with white space - generic match
      cy.get('#card-number').should(($td) => expect($td).to.contain(`************${lastFourCardDigits}`))
      cy.get('#cardholder-name').should(($td) => expect($td).to.contain(validPayment.name))
      cy.get('#email').should(($td) => expect($td).to.contain(likelyTypoEmail))
    })
  })

  describe('Secure payment submission', () => {
    it('Confirming payment should successfully redirect to configured next_url', () => {
      cy.task('setupStubs', submitPaymentCaptureStubs)

      cy.get('#confirm').click()

      // 13. Get charge status before continuing - should be the same as authorised success (GET)
      // 14. Post to connector capture route (POST)
      // 15. Get charge status following post - should show capture success (GET)
      cy.location('pathname').should('eq', `/`)
      cy.location('search').should('eq', `?confirm`)
    })
  })

  describe('Secure card payment page', () => {
    it('Should setup the payment and load the page', () => {
      cy.task('setupStubs', createPaymentChargeStubs)
      cy.visit(`/secure/${tokenId}`)

      // 1. Charge will be created using this id as a token (GET)
      // 2. Token will be deleted (DELETE)
      // 3. Charge will be fetched (GET)
      // 4. Service related to charge will be fetched (GET)
      // 5. Charge status will be updated (PUT)
      // 6. Client will be redirected to /card_details/:chargeId (304)
      cy.location('pathname').should('eq', `/card_details/${chargeId}`)
    })

    it('Should enter valid payment details but really bad email', () => {
      cy.task('setupStubs', checkCardDetailsStubs)
      cy.get('#card-no').type(validPayment.cardNumber)
      cy.server()
      cy.route('POST', `/check_card/${chargeId}`).as('checkCard')
      cy.get('#expiry-month').type(validPayment.expiryMonth)
      cy.get('#expiry-year').type(validPayment.expiryYear)
      cy.get('#cardholder-name').type(validPayment.name)
      cy.get('#cvc').type(validPayment.securityCode)
      cy.get('#address-line-1').type(validPayment.addressLine1)
      cy.get('#address-city').type(validPayment.city)
      cy.get('#address-postcode').type(validPayment.postcode)
      cy.get('#email').type(likelyDoubleTypoEmail)
    })
  })

  describe('Redirect back to enter card details page', () => {
    it('Should show error about email typo', () => {
      cy.task('setupStubs', confirmPaymentDetailsStubs(likelyDoubleTypoEmailFix))
      cy.get('#card-details').submit()

      // 7. Page redirects to itself highlighting the typo and suggesting a fix
      cy.location('pathname').should('eq', `/card_details/${chargeId}`)

      cy.get('#error-summary').should('be.visible')
      cy.get('label[for="email-corrected"]').should('contain', likelyDoubleTypoEmailFix)
      // Suggestion is still not their email address so user updates original email
      cy.get('#email').clear().type(validPayment.email)
    })
  })

  describe('Secure confirmation page', () => {
    it('Submitting confirmation with valid details should redirect to confirmation page and suggested email correction', () => {
      const lastFourCardDigits = validPayment.cardNumber.substr(-4)

      cy.task('setupStubs', confirmPaymentDetailsStubs(validPayment.email))
      cy.get('#card-details').submit()

      // 8. Charge status will be fetched - this will report the same as earlier as nothing has changed (GET)
      // 9. CardID POST to verify that entered card is correct - this shouldn't have changed from earlier (POST)
      // 10. Update charge details on Connector with valid card details (PATCH)
      // 11. Create actual charge for the card details on Connector (expects success message) (POST)
      // 12. Get charge status after authorisation (GET)
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

      // 13. Get charge status before continuing - should be the same as authorised success (GET)
      // 14. Post to connector capture route (POST)
      // 15. Get charge status following post - should show capture success (GET)
      cy.location('pathname').should('eq', `/`)
      cy.location('search').should('eq', `?confirm`)
    })
  })
})
