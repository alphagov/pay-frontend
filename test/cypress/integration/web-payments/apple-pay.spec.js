const { getMockApplePayClass, MockApplePayError } = require('../../utils/apple-pay-js-api-stubs')

describe('Apple Pay payment flow', () => {
  const tokenId = 'be88a908-3b99-4254-9807-c855d53f6b2b'
  const chargeId = 'ub8de8r5mh4pb49rgm1ismaqfv'
  const returnURL = '?success'

  const validPaymentRequestResponse = email => {
    return {
      shippingContact: {
        emailAddress: email || 'jonheslop@bla.test',
        familyName: 'payment',
        givenName: 'mr',
        phoneticFamilyName: '',
        phoneticGivenName: ''
      },
      token: {
        paymentData: {
          version: 'EC_v1',
          data: 'MLHhOn2BXhNw9wLLDR48DyeUcuSmRJ6KnAIGTMGqsgiMpc+AoJ…LUQ6UovkfSnW0sFH6NGZ0jhoap6LYnThYb9WT6yKfEm/rDhM=',
          signature: 'MIAGCSqGSIb3DQEHAqCAMIACAQExDzANBglghkgBZQMEAgEFAD…ZuQFfsLJ+Nb3+7bpjfBsZAhA1sIT1XmHoGFdoCUT3AAAAAAAA',
          header: {
            ephemeralPublicKey: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE5/Qc6z4TY5HQ5n…KC3kJ4DtIWedPQ70N35PBZzJUrFjtvDZFUvs80uo2ynu+lw==',
            publicKeyHash: 'Xzn7W3vsrlKlb0QvUAviASubdtW4BotWrDo5mGG+UWY=',
            transactionId: '372c3858122b6bc39c6095eca2f994a8aa012f3b025d0d72ecfd449c2a5877f9'
          }
        },
        paymentMethod: {
          displayName: 'MasterCard 1358',
          network: 'MasterCard',
          type: 'debit'
        },
        transactionIdentifier: '372C3858122B6BC39C6095ECA2F994A8AA012F3B025D0D72ECFD449C2A5877F9'
      }
    }
  }

  const createPaymentChargeStubs = [
    { name: 'connectorCreateChargeFromToken', opts: { tokenId } },
    { name: 'connectorDeleteToken', opts: { tokenId } },
    { name: 'connectorGetChargeDetails',
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

  const checkCardDetailsStubsWithApplePayorGooglePay = (applePayEnabled, googlePayEnabled) => {
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

  const mockFetchAPI = path => {
    // Mock merchant validation controller response
    if (path === '/apple-pay-merchant-validation') {
      return new Promise(resolve => resolve({
        status: 200,
        json: () => new Promise(resolve => resolve({ signature: `legit` }))
      }))
    }
    // Mock payment auth response
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
      // 2. Token will be deleted (DELETE)
      // 3. Charge will be fetched (GET)
      // 4. Service related to charge will be fetched (GET)
      // 5. Charge status will be updated (PUT)
      // 6. Client will be redirected to /card_details/:chargeId (304)
      cy.location('pathname').should('eq', `/card_details/${chargeId}`)
    })

    it('Should show Apple Pay as a payment option and user chooses Apple Pay', () => {
      cy.task('setupStubs', checkCardDetailsStubsWithApplePayorGooglePay(true, false))
      cy.visit(`/card_details/${chargeId}`, {
        onBeforeLoad: win => {
          // Stub Apple Pay API (which only exists within Safari)
          win.ApplePaySession = getMockApplePayClass(validPaymentRequestResponse, 'jonheslop@bla.test')
          // Stub fetch so we can simulate
          // 1. The merchant validation call to Apple
          // 2. The auth call to connector
          cy.stub(win, 'fetch', mockFetchAPI)
        }
      })

      // 7. Javascript will detect browser is payment Request compatible and show the option to pay with Apple Pay
      cy.get('#payment-method-submit.apple-pay').should('be.visible')
      cy.get('#payment-method-submit.apple-pay').click()

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
      // 2. Token will be deleted (DELETE)
      // 3. Charge will be fetched (GET)
      // 4. Service related to charge will be fetched (GET)
      // 5. Charge status will be updated (PUT)
      // 6. Client will be redirected to /card_details/:chargeId (304)
      cy.location('pathname').should('eq', `/card_details/${chargeId}`)
    })

    it('Should show Apple Pay as a payment option but the user chooses to pay normally', () => {
      cy.task('setupStubs', checkCardDetailsStubsWithApplePayorGooglePay(true, false))
      cy.visit(`/card_details/${chargeId}`, {
        onBeforeLoad: win => {
          // Stub Apple Pay API (which only exists within Safari)
          win.ApplePaySession = getMockApplePayClass(validPaymentRequestResponse, 'jonheslop@bla.test')
          // Stub fetch so we can simulate
          // 1. The merchant validation call to Apple
          // 2. The auth call to connector
          cy.stub(win, 'fetch', mockFetchAPI)
        }
      })

      // 7. Javascript will detect browser is payment Request compatible and show the option to pay with Apple Pay
      cy.get('#payment-method-submit.apple-pay').should('be.visible')

      // 8. User should see normal payment form
      cy.get('#card-no').should('be.visible')
    })

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

    it('Should show Apple Pay but error because a bad email was entered', () => {
      cy.task('setupStubs', checkCardDetailsStubsWithApplePayorGooglePay(true, false))
      cy.visit(`/card_details/${chargeId}`, {
        onBeforeLoad: win => {
          // Stub Apple Pay API (which only exists within Safari)
          win.ApplePaySession = getMockApplePayClass(validPaymentRequestResponse, 'badEmail')
          win.ApplePayError = MockApplePayError
          // Stub fetch so we can simulate
          // 1. The merchant validation call to Apple
          // 2. The auth call to connector
          cy.stub(win, 'fetch', mockFetchAPI)
        }
      })

      // 7. Javascript will detect browser is payment Request compatible and show the option to pay with Apple Pay
      cy.get('#payment-method-submit.apple-pay').should('be.visible')
      cy.get('#payment-method-submit').click()

      // 8. User clicks though the native payment UI but the email is invalid and we throw an error
      cy.get('#error-summary').should('be.visible')
    })

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

    it('Should not show Apple Pay as browser doesn’t support it', () => {
      cy.task('setupStubs', checkCardDetailsStubsWithApplePayorGooglePay(false, false))
      cy.visit(`/card_details/${chargeId}`)

      // 7. Javascript will not detect browser has Apple Pay and won’t show it as an option
      cy.get('#payment-method-submit.apple-pay').should('be.not.visible')

      // 8. User should see normal payment form
      cy.get('#card-no').should('be.visible')
    })

    it('Should setup the payment and load the page and Google Pay is enabled for service as well', () => {
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

    it('Should show Apple Pay as a payment option and user chooses Apple Pay', () => {
      cy.task('setupStubs', checkCardDetailsStubsWithApplePayorGooglePay(true, true))
      cy.visit(`/card_details/${chargeId}`, {
        onBeforeLoad: win => {
          // Stub Apple Pay API (which only exists within Safari)
          win.ApplePaySession = getMockApplePayClass(validPaymentRequestResponse, 'jonheslop@bla.test')
          // Stub fetch so we can simulate
          // 1. The merchant validation call to Apple
          // 2. The auth call to connector
          cy.stub(win, 'fetch', mockFetchAPI)
        }
      })

      // 7. Javascript will detect browser is payment Request compatible and show the option to pay with Apple Pay
      cy.get('#payment-method-submit.apple-pay').should('be.visible')
      cy.get('#payment-method-submit.apple-pay').click()

      // 8. User clicks though the native payment UI and passes their tokenised card data to the auth request handler
      // 9. The auth response comes back from connector and frontend sends capture request and redirects the user the success page
      cy.location().should((loc) => {
        expect(loc.pathname).to.eq('/')
        expect(loc.search).to.eq(returnURL)
      })
    })
  })
})
