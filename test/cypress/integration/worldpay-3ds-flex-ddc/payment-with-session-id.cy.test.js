const { expect } = require('chai')
const _ = require('lodash')
const cardPaymentStubs = require('../../utils/card-payment-stubs')
const { getMockPaymentRequest } = require('../../utils/payment-request-api-stub')

describe('Worldpay 3ds flex card payment flow', () => {
  const tokenId = 'be88a908-3b99-4254-9807-c855d53f6b2b'
  const chargeId = 'ub8de8r5mh4pb49rgm1ismaqfv'
  const worldpaySessionId = 'test session Id'
  const gatewayAccountId = 42
  const sessionOpts = {}
  const providerOpts = {
    paymentProvider: 'worldpay',
    requires3ds: true,
    integrationVersion3ds: 2
  }
  const gatewayAccountOpts = {}
  const additionalChargeOpts = {
    allowGooglePay: true,
    gatewayMerchantId: 'SMTHG12345UP'
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

  const validGooglePayment = {
    details: {
      apiVersionMinor: 0,
      apiVersion: 2,
      paymentMethodData: {
        description: 'Mastercard •••• 1111',
        info: {
          cardNetwork: 'MASTERCARD',
          cardDetails: '1111'
        },
        tokenizationData: {
          type: 'PAYMENT_GATEWAY',
          token: '{"signature":"MEQCIB54h8T/hWY3864Ufkwo4SF5IjhoMV9hjpJRIsqbAn4LAiBZz1VBZ+aiaduX8MN3dBtzyDOZVstwG/8bqJZDbrhKfQ\\u003d","protocolVersion":"ECv1","signedMessage":"{\\"encryptedMessage\\":\\"I2fg4rbEzgRHpvJqN4pHa7Zh93eGePLCKwHljtTfgWELsLOx0Or1cBQ6giKNUrJza3DqhS0AO+Qoar44J2HBryMRaiuSIi/un0zsNV9cfmiLSHNjHNnATkYrfY4u/Or2uSeuAaxLEt3d91NhHWKqf6BelNme182onG23GvOqd4RAukUW7RJ04eouaCIvBisdt866uq/9B3jJb0QiT91ifZ8C/bfScnBFPL4AX0X3G+B7418wSTtUYrMVBnyhNJS8T2Aw9oW8s7c9pra4PI9cHfcu22opRxzSS9snBF39uTwk8c+Pjj3G8yfNI0biDkHNAUiA1YuBW5CgHeJZ/FhayAsAPzfMmI4qei9nTzIEPlDkkGsqFnamCYIg8N9SM51YV8NGS0MQTIYmJg3GHl2D/We30D6dvYSWfLDDJNATAgb3l+4powoxogb28cwE9vLjFhOF/GChrGRpM845E9r1q0tNfg\\\\u003d\\\\u003d\\",\\"ephemeralPublicKey\\":\\"BC9B7aoVhvPzR54m8P1CkGFDSyuxl04iqu22SvnrlLgZEoH3EvpBNKPyMS/nLIe3mJ+cw26GglqMs00B7EEEs0I\\\\u003d\\",\\"tag\\":\\"lOylJZZF3xdVpsqpl5bKgZdsxRPetMRvcKu9WnmFQ/k\\\\u003d\\"}"}'
        },
        type: 'CARD'
      }
    },
    payerEmail: 'name@email.test',
    payerName: 'Some Name',
    complete: () => true
  }

  
  const confirmPaymentDetailsStubs = cardPaymentStubs.confirmPaymentDetailsStubs(chargeId, validPayment)
  const createPaymentChargeStubsEnglish = cardPaymentStubs.buildCreatePaymentChargeStubs(
    tokenId, chargeId, 'en', gatewayAccountId, sessionOpts, providerOpts)
  const checkCardDetailsStubs = cardPaymentStubs.checkCardDetailsStubs(chargeId)
  
  const createGooglePayPaymentChargeStubsEnglish = cardPaymentStubs.buildCreatePaymentChargeStubs(
    tokenId, chargeId, 'en', gatewayAccountId, sessionOpts, providerOpts, gatewayAccountOpts, additionalChargeOpts )

  const worldpay3dsFlexDdcStub = {
    name: 'worldpay3dsFlexDdcIframePost',
    opts: {
      sessionId: worldpaySessionId,
      status: true
    }
  }

  const worldpay3dsFlexDdcStubFailure = {
    name: 'worldpay3dsFlexDdcIframePost',
    opts: {
      sessionId: worldpaySessionId,
      status: false
    }
  }

  beforeEach(() => {
    // this test is for the full process, the session should be maintained
    // as it would for an actual payment flow
    Cypress.Cookies.preserveOnce('frontend_state')
  })

  const setUpAndCheckCardPaymentPage = () => {
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
  }

  const setUpAndCheckCardPaymentPageWithGooglePay = () => {
    describe('Secure card payment page', () => {
      it('Setup Google Pay', () => {
        cy.task('setupStubs', createGooglePayPaymentChargeStubsEnglish)
        cy.visit(`/card_details/${chargeId}`, {
          onBeforeLoad: win => {
            // Stub Payment Request API
            if (win.PaymentRequest) {
              // If we’re running in headed mode
              cy.stub(win, 'PaymentRequest', getMockPaymentRequest(validGooglePayment))
            } else {
              // else headless
              win.PaymentRequest = getMockPaymentRequest(validGooglePayment)
            }
          }
        })
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
  }

  setUpAndCheckCardPaymentPage()
  describe('Valid DDC response', () => {
    it('Form is submitted with the session ID from the DDC response', () => {
      cy.task('setupStubs', [...confirmPaymentDetailsStubs, worldpay3dsFlexDdcStub])

      cy.get('#card-details').submit().should($form => {
        const formVal = $form.first()[0].elements.worldpay3dsFlexDdcResult.value
        expect(formVal).to.eq(worldpaySessionId)
        const ddcStatusVal = $form.first()[0].elements.worldpay3dsFlexDdcStatus.value
        expect(ddcStatusVal).to.eq('valid DDC result')
      })
    })
  })

  setUpAndCheckCardPaymentPage()
  describe('Worldpay responds with status=false', () => {
    it('submitting confirmation should not include the hidden input containing the session ID', () => {
      cy.task('setupStubs', [...confirmPaymentDetailsStubs, worldpay3dsFlexDdcStubFailure])

      cy.get('#card-details').submit().should($form => {
        const formVal = $form.first()[0].elements.worldpay3dsFlexDdcResult
        expect(formVal).to.eq(undefined)
        const ddcStatusVal = $form.first()[0].elements.worldpay3dsFlexDdcStatus.value
        expect(ddcStatusVal).to.eq('DDC result did not have Status of true')
      })
    })
  })

  setUpAndCheckCardPaymentPage()
  describe('DDC times out', () => {
    it('iframe post should still submit the form but without the worldpaySessionId', () => {
      const confirmPaymentDetailsStubsPop = _.cloneDeep(confirmPaymentDetailsStubs)
      confirmPaymentDetailsStubsPop.pop()

      cy.task('setupStubs', confirmPaymentDetailsStubs)

      cy.get('#card-details').submit().should($form => {
        const formVal = $form.first()[0].elements.worldpay3dsFlexDdcResult
        expect(formVal).to.eq(undefined)
      })
    })
  })

  setUpAndCheckCardPaymentPageWithGooglePay()
  describe('Web payment text is not displayed on DDC spinner screen', () => {
    it('iframe post should still submit the form but without the worldpaySessionId', () => {
      cy.task('setupStubs', confirmPaymentDetailsStubs)
      cy.get('#card-details').submit()

      cy.get('.google-pay-container').should('have.attr', 'style', 'display: none;')
      cy.get('.govuk-heading-l.web-payment-button-heading').should('have.attr', 'style', 'display: none;')
    })
  })
})
