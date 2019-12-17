const { getMockPaymentRequest } = require('../../utils/payment-request-api-stub')

describe('Google Pay payment flow', () => {
  const tokenId = 'be88a908-3b99-4254-9807-c855d53f6b2b'
  const chargeId = 'ub8de8r5mh4pb49rgm1ismaqfv'
  const returnURL = '?success'

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

  const createPaymentChargeStubs = [
    { name: 'connectorCreateChargeFromToken', opts: { tokenId } },
    { name: 'connectorMarkTokenAsUsed', opts: { tokenId } },
    {
      name: 'connectorGetChargeDetails',
      opts: {
        chargeId,
        status: 'CREATED',
        state: { finished: false, status: 'created' }
      }
    },
    { name: 'connectorUpdateChargeStatus', opts: { chargeId } },

    // @TODO(sfount) this should pass the service to be queried relative to the charge - right now it just returns a default service
    { name: 'adminUsersGetService' }
  ]

  const checkCardDetailsStubsWithGooglePayorApplePay = (googlePayEnabled, applePayEnabled) => {
    return [
      {
        name: 'connectorGetChargeDetails',
        opts: {
          chargeId,
          status: 'ENTERING CARD DETAILS',
          state: { finished: false, status: 'started' },
          allowApplePay: applePayEnabled,
          allowGooglePay: googlePayEnabled,
          gatewayMerchantId: 'SMTHG12345UP'
        }
      },
      { name: 'cardIdValidCardDetails' }
    ]
  }

  const mockPaymentAuthResponse = () => {
    return new Promise(resolve => resolve({
      status: 200,
      json: () => new Promise(resolve => resolve({ url: `/${returnURL}` }))
    }))
  }

  beforeEach(() => {
    // this test is for the full process, the session should be maintained
    // as it would for an actual payment flow
    Cypress.Cookies.preserveOnce('frontend_state')
  })

  describe('Secure card payment page', () => {
    it('Should setup the payment and load the page', () => {
      cy.task('setupStubs', createPaymentChargeStubs)
      cy.visit(`/secure/${tokenId}`)

      // 1. Charge will be created using this id as a token (GET)
      // 2. Token will be marked as used (POST)
      // 3. Charge will be fetched (GET)
      // 4. Service related to charge will be fetched (GET)
      // 5. Charge status will be updated (PUT)
      // 6. Client will be redirected to /card_details/:chargeId (304)
      cy.location('pathname').should('eq', `/card_details/${chargeId}`)
    })

    it('Should show Google Pay as a payment option and user chooses it', () => {
      cy.task('setupStubs', checkCardDetailsStubsWithGooglePayorApplePay(true, false))
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
          // Stub fetch so we can simulate auth call to connector
          cy.stub(win, 'fetch', mockPaymentAuthResponse)
        }
      })

      // 7. Javascript will detect browser is payment Request compatible and show the option to pay with Google Pay
      cy.get('#google-pay-payment-method-submit.google-pay').should('be.visible')
      cy.get('#google-pay-payment-method-submit.google-pay').click()

      // 8. User clicks though the native payment UI and passes their tokenised card data to the auth request handler
      // 9. The auth response comes back from connector and frontend sends capture request and redirects the user the success page
      cy.location().should((loc) => {
        expect(loc.pathname).to.eq('/')
        expect(loc.search).to.eq(returnURL)
      })
    })

    it('Should setup the payment and load the page', () => {
      cy.task('setupStubs', createPaymentChargeStubs)
      cy.visit(`/secure/${tokenId}`)

      // 1. Charge will be created using this id as a token (GET)
      // 2. Token will be marked as used (POST)
      // 3. Charge will be fetched (GET)
      // 4. Service related to charge will be fetched (GET)
      // 5. Charge status will be updated (PUT)
      // 6. Client will be redirected to /card_details/:chargeId (304)
      cy.location('pathname').should('eq', `/card_details/${chargeId}`)
    })

    it('Should show Google Pay as a payment option and user chooses standard method', () => {
      cy.task('setupStubs', checkCardDetailsStubsWithGooglePayorApplePay(true, false))
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
          // Stub fetch so we can simulate auth call to connector
          cy.stub(win, 'fetch', mockPaymentAuthResponse)
        }
      })

      // 7. Javascript will detect browser is payment Request compatible and show the option to pay with Google Pay
      cy.get('#google-pay-payment-method-submit.google-pay').should('be.visible')

      // 8. User should see normal payment form
      cy.get('#card-no').should('be.visible')
    })

    it('Should not show Google Pay as browser doesn’t support it', () => {
      cy.task('setupStubs', checkCardDetailsStubsWithGooglePayorApplePay(false, false))
      cy.visit(`/card_details/${chargeId}`)

      // 7. Javascript will not detect browser has Apple Pay and won’t show it as an option
      cy.get('#google-pay-payment-method-submit.google-pay').should('be.not.visible')

      // 8. User should see normal payment form
      cy.get('#card-no').should('be.visible')
    })

    it('Should setup the payment and load the page and Apple Pay is enabled for service as well', () => {
      cy.task('setupStubs', createPaymentChargeStubs)
      cy.visit(`/secure/${tokenId}`)

      // 1. Charge will be created using this id as a token (GET)
      // 2. Token will be marked as used (POST)
      // 3. Charge will be fetched (GET)
      // 4. Service related to charge will be fetched (GET)
      // 5. Charge status will be updated (PUT)
      // 6. Client will be redirected to /card_details/:chargeId (304)
      cy.location('pathname').should('eq', `/card_details/${chargeId}`)
    })

    it('Should show Google Pay as a payment option and user chooses it', () => {
      cy.task('setupStubs', checkCardDetailsStubsWithGooglePayorApplePay(true, true))
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
          // Stub fetch so we can simulate auth call to connector
          cy.stub(win, 'fetch', mockPaymentAuthResponse)
        }
      })

      // 7. Javascript will detect browser is payment Request compatible and show the option to pay with Google Pay
      cy.get('#google-pay-payment-method-submit.google-pay').should('be.visible')
      cy.get('#google-pay-payment-method-submit.google-pay').click()

      // 8. User clicks though the native payment UI and passes their tokenised card data to the auth request handler
      // 9. The auth response comes back from connector and frontend sends capture request and redirects the user the success page
      cy.location().should((loc) => {
        expect(loc.pathname).to.eq('/')
        expect(loc.search).to.eq(returnURL)
      })
    })
  })
})
