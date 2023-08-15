const { getMockApplePayClass, MockApplePayError } = require('../../utils/apple-pay-js-api-stubs')
const {
  connectorGetChargeDetails,
  connectorUpdateChargeStatus
} = require('../../utils/stub-builders/charge-stubs')
const {
  connectorFindChargeByToken,
  connectorMarkTokenAsUsed
} = require('../../utils/stub-builders/token-stubs')
const { adminUsersGetService } = require('../../utils/stub-builders/service-stubs')
const { cardIdValidCardDetails } = require('../../utils/stub-builders/card-id-stubs')

describe('Apple Pay payment flow', () => {
  const tokenId = 'be88a908-3b99-4254-9807-c855d53f6b2b'
  const chargeId = 'ub8de8r5mh4pb49rgm1ismaqfv'
  const returnURL = 'humans.txt?success'

  const validPaymentRequestResponse = email => {
    const response = {
      shippingContact: {
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
    if (email) {
      response.shippingContact.emailAddress = email
    }
    return response
  }

  const createPaymentChargeStubs = [
    connectorFindChargeByToken({ tokenId }),
    connectorMarkTokenAsUsed(tokenId),
    connectorGetChargeDetails({
      chargeId,
      status: 'CREATED',
      state: { finished: false, status: 'created' }
    }),
    connectorUpdateChargeStatus(chargeId),
    adminUsersGetService()
  ]

  const createPaymentChargeStubsWithAgreement = [
    connectorFindChargeByToken({ tokenId }),
    connectorMarkTokenAsUsed(tokenId),
    connectorGetChargeDetails({
      chargeId,
      status: 'CREATED',
      state: { finished: false, status: 'created' },
      agreement: { agreement_id: 'an-agreement-id' }
    }),
    connectorUpdateChargeStatus(chargeId),
    adminUsersGetService()
  ]

  const checkCardDetailsStubsWithApplePayorGooglePay = (applePayEnabled, googlePayEnabled, emailCollectionMode = 'MANDATORY', agreement) => {
    const chargeDetails = {
      chargeId,
      status: 'ENTERING CARD DETAILS',
      state: { finished: false, status: 'started' },
      allowApplePay: applePayEnabled,
      allowGooglePay: googlePayEnabled,
      gatewayMerchantId: 'SMTHG12345UP',
      emailCollectionMode: emailCollectionMode
    }

    if (agreement) {
      chargeDetails.agreement = { agreement_id: 'an-agreement-id' }
    }

    return [
      connectorGetChargeDetails(chargeDetails),
      cardIdValidCardDetails()
    ]
  }
  const mockFetchAPI = path => {
    // Mock merchant validation controller response
    if (path === '/apple-pay-merchant-validation') {
      return new Promise(resolve => resolve({
        status: 200,
        json: () => new Promise(resolve => resolve({ signature: 'legit' }))
      }))
    }
    // Mock payment auth response
    return new Promise(resolve => resolve({
      status: 200,
      json: () => new Promise(resolve => resolve({ url: `/${returnURL}` }))
    }))
  }

  describe('Secure card payment page', () => {
    it('Should show Apple Pay as a payment option and allow user to choose Apple Pay', () => {
      cy.task('setupStubs', createPaymentChargeStubs)
      cy.visit(`/secure/${tokenId}`)

      // 1. Charge will be created using this id as a token (GET)
      // 2. Token will be marked as used (POST)
      // 3. Charge will be fetched (GET)
      // 4. Service related to charge will be fetched (GET)
      // 5. Charge status will be updated (PUT)
      // 6. Client will be redirected to /card_details/:chargeId (304)
      cy.location('pathname').should('eq', `/card_details/${chargeId}`)

      cy.task('clearStubs')
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
      cy.get('#apple-pay-payment-method-submit.web-payment-button--apple-pay').should('be.visible')
      cy.get('#apple-pay-payment-method-submit.web-payment-button--apple-pay').click()

      // 8. User clicks though the native payment UI and passes their tokenised card data to the auth request handler
      // 9. The auth response comes back from connector and frontend sends capture request and redirects the user the success page
      cy.location().should((loc) => {
        expect(loc.pathname).to.eq('/humans.txt')
        expect(loc.search).to.eq('?success')
      })
    })

    it('Should show Apple Pay as a payment option with email address collection disabled and allow user to choose Apple Pay', () => {
      cy.task('setupStubs', createPaymentChargeStubs)
      cy.visit(`/secure/${tokenId}`)

      // 1. Charge will be created using this id as a token (GET)
      // 2. Token will be marked as used (POST)
      // 3. Charge will be fetched (GET)
      // 4. Service related to charge will be fetched (GET)
      // 5. Charge status will be updated (PUT)
      // 6. Client will be redirected to /card_details/:chargeId (304)
      cy.location('pathname').should('eq', `/card_details/${chargeId}`)

      cy.task('clearStubs')
      cy.task('setupStubs', checkCardDetailsStubsWithApplePayorGooglePay(true, false, 'OFF'))

      cy.visit(`/card_details/${chargeId}`, {
        onBeforeLoad: win => {
          // Stub Apple Pay API (which only exists within Safari)
          win.ApplePaySession = getMockApplePayClass(validPaymentRequestResponse, null)
          // Stub fetch so we can simulate
          // 1. The merchant validation call to Apple
          // 2. The auth call to connector
          cy.stub(win, 'fetch', mockFetchAPI)
        }
      })

      // 7. Javascript will detect browser is payment Request compatible and show the option to pay with Apple Pay
      cy.get('#apple-pay-payment-method-submit.web-payment-button--apple-pay').should('be.visible')
      cy.get('#apple-pay-payment-method-submit.web-payment-button--apple-pay').click()

      // 8. User clicks though the native payment UI and passes their tokenised card data to the auth request handler
      // 9. The auth response comes back from connector and frontend sends capture request and redirects the user the success page
      cy.location().should((loc) => {
        expect(loc.pathname).to.eq('/humans.txt')
        expect(loc.search).to.eq('?success')
      })
    })

    it('Should show Apple Pay as a payment option but allow user to pay with a card', () => {
      cy.task('setupStubs', createPaymentChargeStubs)
      cy.visit(`/secure/${tokenId}`)

      // 1. Charge will be created using this id as a token (GET)
      // 2. Token will be marked as used (POST)
      // 3. Charge will be fetched (GET)
      // 4. Service related to charge will be fetched (GET)
      // 5. Charge status will be updated (PUT)
      // 6. Client will be redirected to /card_details/:chargeId (304)
      cy.location('pathname').should('eq', `/card_details/${chargeId}`)

      cy.task('clearStubs')
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
      cy.get('#apple-pay-payment-method-submit.web-payment-button--apple-pay').should('be.visible')

      // 8. User should see normal payment form
      cy.get('#card-no').should('be.visible')
    })

    it('Should show Apple Pay but error because a bad email was entered', () => {
      cy.task('setupStubs', createPaymentChargeStubs)
      cy.visit(`/secure/${tokenId}`)

      // 1. Charge will be created using this id as a token (GET)
      // 2. Token will be marked as used (POST)
      // 3. Charge will be fetched (GET)
      // 4. Service related to charge will be fetched (GET)
      // 5. Charge status will be updated (PUT)
      // 6. Client will be redirected to /card_details/:chargeId (304)
      cy.location('pathname').should('eq', `/card_details/${chargeId}`)

      // eslint-disable-next-line handle-callback-err
      cy.on('uncaught:exception', (err, runnable) => {
        // returning false here prevents Cypress from failing when the purpose of the test is an uncaught exception
        return false
      })

      cy.task('clearStubs')
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
      cy.get('#apple-pay-payment-method-submit.web-payment-button--apple-pay').should('be.visible')
      cy.get('#apple-pay-payment-method-submit').click()

      // 8. User clicks though the native payment UI but the email is invalid and we throw an error
      cy.get('#error-summary').should('be.visible')
    })

    it('Should not show Apple Pay as browser doesn’t support it', () => {
      cy.task('setupStubs', createPaymentChargeStubs)
      cy.visit(`/secure/${tokenId}`)

      // 1. Charge will be created using this id as a token (GET)
      // 2. Token will be marked as used (POST)
      // 3. Charge will be fetched (GET)
      // 4. Service related to charge will be fetched (GET)
      // 5. Charge status will be updated (PUT)
      // 6. Client will be redirected to /card_details/:chargeId (304)
      cy.location('pathname').should('eq', `/card_details/${chargeId}`)

      cy.task('clearStubs')
      cy.task('setupStubs', checkCardDetailsStubsWithApplePayorGooglePay(false, false))

      cy.visit(`/card_details/${chargeId}`)

      // 7. Javascript will not detect browser has Apple Pay and won’t show it as an option
      cy.get('#apple-pay-payment-method-submit.web-payment-button--apple-pay').should('not.exist')

      // 8. User should see normal payment form
      cy.get('#card-no').should('be.visible')
    })

    it('Should show Apple Pay as a payment option when Google pay is an option and allow user to use Apple Pay', () => {
      cy.task('setupStubs', createPaymentChargeStubs)
      cy.visit(`/secure/${tokenId}`)

      // 1. Charge will be created using this id as a token (GET)
      // 2. Token will be marked as used (POST)
      // 3. Charge will be fetched (GET)
      // 4. Service related to charge will be fetched (GET)
      // 5. Charge status will be updated (PUT)
      // 6. Client will be redirected to /card_details/:chargeId (304)
      cy.location('pathname').should('eq', `/card_details/${chargeId}`)

      // eslint-disable-next-line handle-callback-err
      cy.on('uncaught:exception', (err, runnable) => {
        // returning false here prevents Cypress from failing when the purpose of the test is an uncaught exception
        return false
      })

      cy.task('clearStubs')
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
      cy.get('#apple-pay-payment-method-submit.web-payment-button--apple-pay').should('be.visible')
      cy.get('#apple-pay-payment-method-submit.web-payment-button--apple-pay').click()

      // 8. User clicks though the native payment UI and passes their tokenised card data to the auth request handler
      // 9. The auth response comes back from connector and frontend sends capture request and redirects the user the success page
      cy.location().should((loc) => {
        expect(loc.pathname).to.eq('/humans.txt')
        expect(loc.search).to.eq('?success')
      })
    })

    it('Should not show Apple Pay as payment is a recurring one', () => {
      cy.task('setupStubs', createPaymentChargeStubsWithAgreement)
      cy.visit(`/secure/${tokenId}`)

      // 1. Charge will be created using this id as a token (GET)
      // 2. Token will be marked as used (POST)
      // 3. Charge will be fetched (GET)
      // 4. Service related to charge will be fetched (GET)
      // 5. Charge status will be updated (PUT)
      // 6. Client will be redirected to /card_details/:chargeId (304)
      cy.location('pathname').should('eq', `/card_details/${chargeId}`)

      cy.task('clearStubs')
      cy.task('setupStubs', checkCardDetailsStubsWithApplePayorGooglePay(true, false, 'MANDATORY', true))

      cy.visit(`/card_details/${chargeId}`)

      // 7. Javascript will not detect browser has Apple Pay and won’t show it as an option
      cy.get('#apple-pay-payment-method-submit.web-payment-button--apple-pay').should('not.exist')

      // 8. User should see normal payment form
      cy.get('#card-no').should('be.visible')
    })
  })
})
