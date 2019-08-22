const cardPaymentStubs = require('../../utils/card-payment-stubs')

describe('Standard card payment flow', () => {
  const tokenId = 'be88a908-3b99-4254-9807-c855d53f6b2b'
  const chargeId = 'ub8de8r5mh4pb49rgm1ismaqfv'
  const sessionId = 'test session Id'
  const gatewayAccountId = 42
  const sessionOpts = {}
  const providerOpts = {
    paymentProvider: 'worldpay',
    requires3ds: true,
    integrationVersion3ds: 2
  }

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

  const createPaymentChargeStubsEnglish = cardPaymentStubs.buildCreatePaymentChargeStubs(
    tokenId, chargeId, 'en', gatewayAccountId, sessionOpts, providerOpts)

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
    { name: 'connectorValidPatchConfirmedChargeDetails', opts: { chargeId } },
    { name: 'worldpay3dsflexddcIframePost', opts: { sessionId } }
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
    it('Submitting confirmation with valid details and a JWT present should cause worldpay iFrame to pass extra input when submitting with the session ID', () => {
      cy.task('setupStubs', confirmPaymentDetailsStubs)

      cy.get('#card-details').submit().should($form => {
        const formVal = $form.first()[0].elements.worldpay3dsFlexDdcResult.value
        expect(formVal).to.eq(sessionId)
      })
    })
  })
})
