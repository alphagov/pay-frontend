describe('Apple Pay payment flow', () => {
  const tokenId = 'be88a908-3b99-4254-9807-c855d53f6b2b'
  const chargeId = 'ub8de8r5mh4pb49rgm1ismaqfv'
  const returnURL = '?success'

  const validPaymentRequestResponse = {
    shippingContact: {
      emailAddress: 'jonheslop@bla.test',
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

  const checkCardDetailsStubs = [
    {
      name: 'connectorGetChargeDetails',
      opts: {
        chargeId,
        status: 'ENTERING CARD DETAILS',
        state: { finished: false, status: 'started' },
        allowApplePay: true
      }
    },
    { name: 'cardIdValidCardDetails' }
  ]

  // Mock class for Apple Pay
  class MockApplePaySession {
    completePayment () {
      return true
    }

    completeMerchantValidation () {
      return true
    }

    begin () {
      if (this._onvalidatemerchant) {
        this._onvalidatemerchant(
          { validationURL: 'https://fakeapple.url' }
        )
      }

      if (this._onpaymentauthorized) {
        this._onpaymentauthorized(
          { payment: validPaymentRequestResponse }
        )
      }
    }

    set onvalidatemerchant (value) {
      this._onvalidatemerchant = value
    }

    set onpaymentauthorized (value) {
      this._onpaymentauthorized = value
    }
  }

  // Mock function to trick JS into thinking Apple Pay is available
  MockApplePaySession.canMakePayments = () => true

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

    it('Should show Apple Pay as a payment option', () => {
      cy.task('setupStubs', checkCardDetailsStubs)
      cy.visit(`/card_details/${chargeId}`, {
        onBeforeLoad: win => {
          // Stub Apple Pay API (which only exists within Safari)
          win.ApplePaySession = MockApplePaySession
          // Stub fetch so we can simulate
          // 1. The merchant validation call to Apple
          // 2. The auth call to connector
          cy.stub(win, 'fetch', mockFetchAPI)
        }
      })

      // 7. Javascript will detect browser is payment Request compatible and show the option to pay with Apple Pay
      cy.get('#payment-method-apple-pay').should('be.visible')
      cy.get('#payment-method-apple-pay').click()
      cy.get('#payment-method-submit').should('be.visible')
      cy.get('#payment-method-submit').click()

      // 8. User clicks though the native payment UI and passes their tokenised card data to the auth request handler
      // 9. The auth response comes back from connector and frontend sends capture request and redirects the user the success page
      cy.location().should((loc) => {
        expect(loc.pathname).to.eq('/')
        expect(loc.search).to.eq(returnURL)
      })
    })
  })
})
