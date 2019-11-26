const cardPaymentStubs = require('../../utils/card-payment-stubs')
const { getMockApplePayClass } = require('../../utils/apple-pay-js-api-stubs')
const { getMockPaymentRequest } = require('../../utils/payment-request-api-stub')

const validPaymentRequestResponse = {
  details: {
    apiVersionMinor: 0,
    apiVersion: 2,
    paymentMethodData: {
      description: 'Mastercard •••• 4242',
      info: {
        cardNetwork: 'MASTERCARD',
        cardDetails: '4242'
      },
      tokenizationData: {
        type: 'PAYMENT_GATEWAY',
        token: '{"signature":"MEQCIB54h8T/hWY3864Ufkwo4SF5IjhoMV9hjpJRIsqbAn4LAiBZz1VBZ+aiaduX8MN3dBtzyDOZVstwG/8bqJZDbrhKfQ\\u003d","protocolVersion":"ECv1","signedMessage":"{\\"encryptedMessage\\":\\"I2fg4rbEzgRHpvJqN4pHa7Zh93eGePLCKwHljtTfgWELsLOx0Or1cBQ6giKNUrJza3DqhS0AO+Qoar44J2HBryMRaiuSIi/un0zsNV9cfmiLSHNjHNnATkYrfY4u/Or2uSeuAaxLEt3d91NhHWKqf6BelNme182onG23GvOqd4RAukUW7RJ04eouaCIvBisdt866uq/9B3jJb0QiT91ifZ8C/bfScnBFPL4AX0X3G+B7418wSTtUYrMVBnyhNJS8T2Aw9oW8s7c9pra4PI9cHfcu22opRxzSS9snBF39uTwk8c+Pjj3G8yfNI0biDkHNAUiA1YuBW5CgHeJZ/FhayAsAPzfMmI4qei9nTzIEPlDkkGsqFnamCYIg8N9SM51YV8NGS0MQTIYmJg3GHl2D/We30D6dvYSWfLDDJNATAgb3l+4powoxogb28cwE9vLjFhOF/GChrGRpM845E9r1q0tNfg\\\\u003d\\\\u003d\\",\\"ephemeralPublicKey\\":\\"BC9B7aoVhvPzR54m8P1CkGFDSyuxl04iqu22SvnrlLgZEoH3EvpBNKPyMS/nLIe3mJ+cw26GglqMs00B7EEEs0I\\\\u003d\\",\\"tag\\":\\"lOylJZZF3xdVpsqpl5bKgZdsxRPetMRvcKu9WnmFQ/k\\\\u003d\\"}"}'
      },
      type: 'CARD'
    }
  },
  payerEmail: 'name@email.fyi',
  payerName: 'Some Name',
  complete: () => true
}

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
    {
      name: 'connectorGetChargeDetails',
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
    {
      name: 'connectorMultipleSubsequentChargeDetails',
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
    {
      name: 'connectorMultipleSubsequentChargeDetails',
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
      // 2. Token will be marked as used (POST)
      // 3. Charge will be fetched (GET)
      // 4. Service related to charge will be fetched (GET)
      // 5. Charge status will be updated (PUT)
      // 6. Client will be redirected to /card_details/:chargeId (304) and global variable `chargeId` should be set
      cy.location('pathname').should('eq', `/card_details/${chargeId}`)
      cy.window().its('chargeId').should('eq', `${chargeId}`)
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
      cy.get('#card-number').should(($td) => expect($td).to.contain(`●●●●●●●●●●●●${lastFourCardDigits}`))
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
      cy.location('pathname').should('eq', '/')
      cy.location('search').should('eq', '?confirm')
    })
  })

  describe('Secure card payment page should show error', () => {
    it('Should setup the payment and load the page', () => {
      cy.task('setupStubs', createPaymentChargeStubsEnglish)
      cy.visit(`/secure/${tokenId}`)

      // 1. Charge will be created using this id as a token (GET)
      // 2. Token will be marked as used (POST)
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
      // 2. Token will be marked as used (POST)
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

  describe('Secure card payment page on Google Pay enabled browser but not Google Pay enabled service', () => {
    it('Should setup the payment and load the page', () => {
      cy.task('setupStubs', createPaymentChargeStubsEnglish)
      cy.visit(`/secure/${tokenId}`)

      // 1. Charge will be created using this id as a token (GET)
      // 2. Token will be marked as used (POST)
      // 3. Charge will be fetched (GET)
      // 4. Service related to charge will be fetched (GET)
      // 5. Charge status will be updated (PUT)
      // 6. Client will be redirected to /card_details/:chargeId (304)
      cy.location('pathname').should('eq', `/card_details/${chargeId}`)
    })

    it('Should enter and validate a correct card', () => {
      cy.task('setupStubs', checkCardDetailsStubs)

      cy.visit(`/card_details/${chargeId}`, {
        onBeforeLoad: win => {
          // Stub Payment Request API
          if (win.PaymentRequest) {
            // If we’re running in headed mode
            cy.stub(win, 'PaymentRequest', getMockPaymentRequest(validPaymentRequestResponse))
          } else {
            // else headless
            win.PaymentRequest = getMockPaymentRequest(validPaymentRequestResponse)
          }
        }
      })

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

  describe('Secure card payment page on Apple Pay enabled browser but not Apple Pay enabled service', () => {
    it('Should setup the payment and load the page', () => {
      cy.task('setupStubs', createPaymentChargeStubsEnglish)
      cy.visit(`/secure/${tokenId}`)

      // 1. Charge will be created using this id as a token (GET)
      // 2. Token will be marked as used (POST)
      // 3. Charge will be fetched (GET)
      // 4. Service related to charge will be fetched (GET)
      // 5. Charge status will be updated (PUT)
      // 6. Client will be redirected to /card_details/:chargeId (304)
      cy.location('pathname').should('eq', `/card_details/${chargeId}`)
    })

    it('Should enter and validate a correct card', () => {
      cy.task('setupStubs', checkCardDetailsStubs)

      cy.visit(`/card_details/${chargeId}`, {
        onBeforeLoad: win => {
          // Stub Apple Pay API (which only exists within Safari)
          win.ApplePaySession = getMockApplePayClass('jonheslop@bla.test')
        }
      })

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
      cy.get('#card-number').should(($td) => expect($td).to.contain(`●●●●●●●●●●●●${lastFourCardDigits}`))
      cy.get('#cardholder-name').should(($td) => expect($td).to.contain(validPayment.name))
      cy.get('#email').should(($td) => expect($td).to.contain(validPayment.email))
    })
  })

  describe('Secure card payment page with prefilled cardholder details', () => {
    it('should load all cardholder details to page', () => {
      const opts = {
        email: 'joe.bogs@example.org',
        cardholderName: 'Joe Bogs',
        line1: '13 Rogue Avenue',
        postcode: 'AB1 CD2',
        city: 'London',
        country: 'GB'
      }
      const createPaymentChargeStubsPrefilledCardDetails = cardPaymentStubs.buildCreatePaymentChargeWithPrefilledCardholderDeatilsStubs(tokenId, chargeId, 42, opts)
      cy.task('setupStubs', createPaymentChargeStubsPrefilledCardDetails)
      cy.visit(`/secure/${tokenId}`)
      cy.location('pathname').should('eq', `/card_details/${chargeId}`)
      cy.get('#cardholder-name').should('have.value', opts.cardholderName)
      cy.get('#address-line-1').should('have.value', opts.line1)
      cy.get('#address-line-2').should('have.value', '')
      cy.get('#address-city').should('have.value', opts.city)
      cy.get('#address-postcode').should('have.value', opts.postcode)
      cy.get('#address-country').should('have.value', 'United Kingdom')
      cy.get('#email').should('have.value', opts.email)
    })

    it('should load partial cardholder details to page', () => {
      const opts = {
        cardholderName: 'Joe Bogs',
        line1: '13 Rogue Avenue',
        city: 'London',
        country: 'GB'
      }
      const createPaymentChargeStubsPrefilledCardDetails = cardPaymentStubs.buildCreatePaymentChargeWithPrefilledCardholderDeatilsStubs(tokenId, chargeId, 42, opts)
      cy.task('setupStubs', createPaymentChargeStubsPrefilledCardDetails)
      cy.visit(`/secure/${tokenId}`)
      cy.location('pathname').should('eq', `/card_details/${chargeId}`)
      cy.get('#address-country').should('have.value', 'United Kingdom')
    })

    it('should load country to page', () => {
      const opts = {
        country: 'IE'
      }
      const createPaymentChargeStubsPrefilledCardDetails = cardPaymentStubs.buildCreatePaymentChargeWithPrefilledCardholderDeatilsStubs(tokenId, chargeId, 42, opts)
      cy.task('setupStubs', createPaymentChargeStubsPrefilledCardDetails)
      cy.visit(`/secure/${tokenId}`)
      cy.location('pathname').should('eq', `/card_details/${chargeId}`)
      cy.get('#address-country').should('have.value', 'Ireland')
    })

    it('should load United Kingdom when invalid country code', () => {
      const opts = {
        country: 'QQ'
      }
      const createPaymentChargeStubsPrefilledCardDetails = cardPaymentStubs.buildCreatePaymentChargeWithPrefilledCardholderDeatilsStubs(tokenId, chargeId, 42, opts)
      cy.task('setupStubs', createPaymentChargeStubsPrefilledCardDetails)
      cy.visit(`/secure/${tokenId}`)
      cy.location('pathname').should('eq', `/card_details/${chargeId}`)
      cy.get('#address-country').should('have.value', 'United Kingdom')
    })

    it('should load United Kingdom when no country code', () => {
      const opts = {
      }
      const createPaymentChargeStubsPrefilledCardDetails = cardPaymentStubs.buildCreatePaymentChargeWithPrefilledCardholderDeatilsStubs(tokenId, chargeId, 42, opts)
      cy.task('setupStubs', createPaymentChargeStubsPrefilledCardDetails)
      cy.visit(`/secure/${tokenId}`)
      cy.location('pathname').should('eq', `/card_details/${chargeId}`)
      cy.get('#address-country').should('have.value', 'United Kingdom')
    })
  })
})
