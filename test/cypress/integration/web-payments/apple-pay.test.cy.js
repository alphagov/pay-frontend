const { getMockApplePayClass, MockApplePayError } = require('../../utils/apple-pay-js-api-stubs')
const {
  connectorMultipleSubsequentChargeDetails,
  connectorUpdateChargeStatus,
  connectorAuthWalletCharge,
  connectorPostValidCaptureCharge
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

  const checkCardDetailsStubsWithApplePayorGooglePay = (applePayEnabled, googlePayEnabled, emailCollectionMode = 'MANDATORY', agreement) => {
    const createdCharge = {
      chargeId,
      status: 'CREATED',
      state: { finished: false, status: 'started' },
      allowApplePay: applePayEnabled,
      allowGooglePay: googlePayEnabled,
      gatewayMerchantId: 'SMTHG12345UP',
      emailCollectionMode: emailCollectionMode,
      paymentProvider: 'worldpay'
    }

    if (agreement) {
      createdCharge.agreement = { agreement_id: 'an-agreement-id' }
    }

    const enteringCardDetailsCharge = {
      chargeId,
      status: 'CAPTURE APPROVED',
      state: { finished: true, status: 'success' },
      allowApplePay: applePayEnabled,
      allowGooglePay: googlePayEnabled,
      gatewayMerchantId: 'SMTHG12345UP',
      requires3ds: true,
      integrationVersion3ds: 2,
      paymentProvider: 'worldpay'
    }

    if (agreement) {
      enteringCardDetailsCharge.agreement = { agreement_id: 'an-agreement-id' }
    }

    return [
      connectorFindChargeByToken({ tokenId }),
      connectorMultipleSubsequentChargeDetails([
        createdCharge,
        enteringCardDetailsCharge]),
      cardIdValidCardDetails(),
      connectorMarkTokenAsUsed(tokenId),
      connectorUpdateChargeStatus(chargeId),
      adminUsersGetService(),
      connectorAuthWalletCharge(chargeId, 'apple'),
      connectorPostValidCaptureCharge(chargeId)
    ]
  }

  describe('Secure card payment page', () => {
    it('Should show Apple Pay as a payment option and allow user to choose Apple Pay', () => {
      cy.task('setupStubs', checkCardDetailsStubsWithApplePayorGooglePay(true, false))
      cy.visit(`/secure/${tokenId}`, {
        onBeforeLoad: win => {
          win.ApplePaySession = getMockApplePayClass(validPaymentRequestResponse, 'jonheslop@bla.test')
        }
      })

      cy.location('pathname').should('eq', `/card_details/${chargeId}`)

      cy.intercept('/apple-pay-merchant-validation', { method: 'POST', times: 1 }, 'test').as('apple-pay-merchant-validation-request')

      cy.get('#apple-pay-payment-method-submit.web-payment-button--apple-pay').should('be.visible')
      cy.get('#apple-pay-payment-method-submit.web-payment-button--apple-pay').click()

      cy.wait('@apple-pay-merchant-validation-request')

      cy.location().should((loc) => {
        expect(loc.pathname).to.eq('/humans.txt')
        expect(loc.search).to.eq('?confirm')
      })
    })

    it('Should show Apple Pay as a payment option with email address collection disabled and allow user to choose Apple Pay', () => {
      cy.task('setupStubs', checkCardDetailsStubsWithApplePayorGooglePay(true, false, 'OFF'))

      cy.visit(`/secure/${tokenId}`, {
        onBeforeLoad: win => {
          win.ApplePaySession = getMockApplePayClass(validPaymentRequestResponse, 'jonheslop@bla.test')
        }
      })

      cy.location('pathname').should('eq', `/card_details/${chargeId}`)

      cy.intercept('/apple-pay-merchant-validation', { method: 'POST', times: 1 }, 'test').as('apple-pay-merchant-validation-request')

      cy.get('#apple-pay-payment-method-submit.web-payment-button--apple-pay').should('be.visible')
      cy.get('#apple-pay-payment-method-submit.web-payment-button--apple-pay').click()

      cy.wait('@apple-pay-merchant-validation-request')

      cy.location().should((loc) => {
        expect(loc.pathname).to.eq('/humans.txt')
        expect(loc.search).to.eq('?confirm')
      })
    })

    it('Should show Apple Pay as a payment option but allow user to pay with a card', () => {
      cy.task('setupStubs', checkCardDetailsStubsWithApplePayorGooglePay(true, false))
      cy.visit(`/secure/${tokenId}`, {
        onBeforeLoad: win => {
          win.ApplePaySession = getMockApplePayClass(validPaymentRequestResponse, 'jonheslop@bla.test')
        }
      })

      cy.location('pathname').should('eq', `/card_details/${chargeId}`)

      cy.get('#apple-pay-payment-method-submit.web-payment-button--apple-pay').should('be.visible')

      cy.get('#card-no').should('be.visible')
    })

    it('Should show Apple Pay but error because a bad email was entered', () => {
      cy.task('setupStubs', checkCardDetailsStubsWithApplePayorGooglePay(true, false))
      cy.visit(`/secure/${tokenId}`, {
        onBeforeLoad: win => {
          win.ApplePaySession = getMockApplePayClass(validPaymentRequestResponse, 'bad-email')
          win.ApplePayError = MockApplePayError
        }
      })

      cy.location('pathname').should('eq', `/card_details/${chargeId}`)

      // eslint-disable-next-line handle-callback-err
      cy.on('uncaught:exception', (err, runnable) => {
        console.log('Expected error', err)
        return false
      })

      cy.intercept('/apple-pay-merchant-validation', { method: 'POST', times: 1 }, 'test').as('apple-pay-merchant-validation-request')

      cy.get('#apple-pay-payment-method-submit.web-payment-button--apple-pay').should('be.visible')
      cy.get('#apple-pay-payment-method-submit').click()

      cy.wait('@apple-pay-merchant-validation-request')

      cy.get('#error-summary').should('be.visible')
    })

    it('Should not show Apple Pay as browser doesn’t support it', () => {
      cy.task('setupStubs', checkCardDetailsStubsWithApplePayorGooglePay(false, false))

      cy.visit(`/secure/${tokenId}`, {
        onBeforeLoad: win => {
          win.ApplePaySession = getMockApplePayClass(validPaymentRequestResponse, 'jonheslop@bla.test')
        }
      })

      cy.get('#apple-pay-payment-method-submit.web-payment-button--apple-pay').should('not.exist')

      cy.get('#card-no').should('be.visible')
    })

    it('Should show Apple Pay as a payment option when Google pay is an option and allow user to use Apple Pay', () => {
      cy.task('setupStubs', checkCardDetailsStubsWithApplePayorGooglePay(true, true))

      cy.visit(`/secure/${tokenId}`, {
        onBeforeLoad: win => {
          win.ApplePaySession = getMockApplePayClass(validPaymentRequestResponse, 'jonheslop@bla.test')
        }
      })

      cy.location('pathname').should('eq', `/card_details/${chargeId}`)

      cy.intercept('/apple-pay-merchant-validation', { method: 'POST', times: 1 }, 'test').as('apple-pay-merchant-validation-request')

      cy.get('#apple-pay-payment-method-submit.web-payment-button--apple-pay').should('be.visible')
      cy.get('#apple-pay-payment-method-submit.web-payment-button--apple-pay').click()

      cy.wait('@apple-pay-merchant-validation-request')

      cy.location().should((loc) => {
        expect(loc.pathname).to.eq('/humans.txt')
        expect(loc.search).to.eq('?confirm')
      })
    })

    it('Should not show Apple Pay as payment is a recurring one', () => {
      cy.task('setupStubs', checkCardDetailsStubsWithApplePayorGooglePay(true, false, 'MANDATORY', true))

      cy.visit(`/secure/${tokenId}`, {
        onBeforeLoad: win => {
          win.ApplePaySession = getMockApplePayClass(validPaymentRequestResponse, 'jonheslop@bla.test')
        }
      })

      cy.location('pathname').should('eq', `/card_details/${chargeId}`)

      cy.get('#apple-pay-payment-method-submit.web-payment-button--apple-pay').should('not.exist')

      cy.get('#card-no').should('be.visible')
    })
  })
})
