const { getMockPaymentRequest } = require('../../utils/payment-request-api-stub')
const {
  connectorUpdateChargeStatus,
  connectorMultipleSubsequentChargeDetails,
  connectorWorldpay3dsFlexDdcJwt,
  connectorAuthWalletCharge,
  connectorPostValidCaptureCharge
} = require('../../utils/stub-builders/charge-stubs')
const {
  connectorFindChargeByToken,
  connectorMarkTokenAsUsed
} = require('../../utils/stub-builders/token-stubs')
const { adminUsersGetService } = require('../../utils/stub-builders/service-stubs')
const { cardIdValidCardDetails } = require('../../utils/stub-builders/card-id-stubs')
const { worldpay3dsFlexDdcIframePost } = require('../../utils/stub-builders/worldpay-stubs')

describe('Google Pay payment flow', () => {
  const tokenId = 'be88a908-3b99-4254-9807-c855d53f6b2b'
  const chargeId = 'ub8de8r5mh4pb49rgm1ismaqfv'
  const worldpaySessionId = 'test session Id'

  const paymentDetails = {
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
  }

  const validPaymentRequestResponse = {
    details: paymentDetails,
    payerEmail: 'name@email.test',
    payerName: 'Some Name',
    complete: () => true
  }

  const chargeStubsWithGooglePayOrApplePayEnabled = (googlePayEnabled, applePayEnabled, agreement) => {
    const createdCharge = {
      chargeId,
      status: 'CREATED',
      state: { finished: false, status: 'created' },
      allowApplePay: applePayEnabled,
      allowGooglePay: googlePayEnabled,
      gatewayMerchantId: 'SMTHG12345UP',
      requires3ds: true,
      integrationVersion3ds: 2,
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
      connectorMultipleSubsequentChargeDetails([
        createdCharge,
        enteringCardDetailsCharge]),
      connectorFindChargeByToken({ tokenId }),
      connectorMarkTokenAsUsed(tokenId),
      connectorUpdateChargeStatus(chargeId),
      adminUsersGetService(),
      cardIdValidCardDetails(),
      connectorAuthWalletCharge(chargeId, 'google', 'worldpay'),
      connectorPostValidCaptureCharge(chargeId),
      connectorWorldpay3dsFlexDdcJwt(chargeId)
    ]
  }

  const worldpay3dsFlexDdcStub = worldpay3dsFlexDdcIframePost(worldpaySessionId, true)
  const worldpay3dsFlexDdcStubFailure = worldpay3dsFlexDdcIframePost(worldpaySessionId, false)

  describe('Secure card payment page', () => {
    it('Should handle Google pay correctly', () => {
      cy.task('setupStubs', [...chargeStubsWithGooglePayOrApplePayEnabled(false, false)])
      cy.visit(`/secure/${tokenId}`)

      cy.location('pathname').should('eq', `/card_details/${chargeId}`)

      cy.log('Should show Google Pay as a payment option and user chooses it')

      cy.task('clearStubs')
      cy.task('setupStubs', [...chargeStubsWithGooglePayOrApplePayEnabled(true, false), worldpay3dsFlexDdcStub])

      cy.visit(`/card_details/${chargeId}`, {
        onBeforeLoad: win => {
          if (win.PaymentRequest) {
            cy.stub(win, 'PaymentRequest', getMockPaymentRequest(validPaymentRequestResponse))
          } else {
            win.PaymentRequest = getMockPaymentRequest(validPaymentRequestResponse)
          }
        }
      })

      cy.get('#google-pay-payment-method-submit.web-payment-button--google-pay').should('be.visible')
      cy.get('#google-pay-payment-method-submit.web-payment-button--google-pay').click()

      cy.location().should((loc) => {
        expect(loc.pathname).to.eq('/humans.txt')
        expect(loc.search).to.eq('?confirm')
      })

      cy.task('clearStubs')
      cy.task('setupStubs', [...chargeStubsWithGooglePayOrApplePayEnabled(true, false), worldpay3dsFlexDdcStubFailure])

      cy.clearCookies()

      cy.visit(`/secure/${tokenId}`, {
        onBeforeLoad: win => {
          if (win.PaymentRequest) {
            cy.stub(win, 'PaymentRequest', getMockPaymentRequest(validPaymentRequestResponse))
          } else {
            win.PaymentRequest = getMockPaymentRequest(validPaymentRequestResponse)
          }
        }
      })

      cy.log('Should show Google Pay as a payment option and user chooses it but DDC fails')

      cy.get('#google-pay-payment-method-submit.web-payment-button--google-pay').should('be.visible')
      cy.get('#google-pay-payment-method-submit.web-payment-button--google-pay').click()

      cy.location().should((loc) => {
        expect(loc.pathname).to.eq('/humans.txt')
        expect(loc.search).to.eq('?confirm')
      })

      cy.task('clearStubs')
      cy.task('setupStubs', [...chargeStubsWithGooglePayOrApplePayEnabled(true, false), worldpay3dsFlexDdcStub])

      cy.clearCookies()

      cy.visit(`/secure/${tokenId}`, {
        onBeforeLoad: win => {
          if (win.PaymentRequest) {
            cy.stub(win, 'PaymentRequest', getMockPaymentRequest(validPaymentRequestResponse))
          } else {
            win.PaymentRequest = getMockPaymentRequest(validPaymentRequestResponse)
          }
        }
      })

      cy.intercept(`/web-payments-auth-request/google/${chargeId}`, {
        method: 'POST',
        times: 1
      },
      {
        statusCode: 500
      }).as('first-web-payments-auth-request-which-fails')

      cy.log('Should show Google Pay as a payment option and user chooses it but fetch call fails and shows one error')

      cy.get('#google-pay-payment-method-submit.web-payment-button--google-pay').should('be.visible')
      cy.get('#google-pay-payment-method-submit.web-payment-button--google-pay').click()

      cy.wait('@first-web-payments-auth-request-which-fails')

      cy.get('[data-cy=error-summary]').find('li')
        .should('have.length', 1)
        .eq(0).should('have.text', 'No money has been taken from your account, please try again')

      cy.intercept(`/web-payments-auth-request/google/${chargeId}`, {
        method: 'POST',
        times: 1
      },
      {
        statusCode: 500
      }).as('second-web-payments-auth-request-which-fails')

      cy.log('Should show Google Pay as a payment option and user chooses it again but fetch call fails and shows one error')

      cy.get('#google-pay-payment-method-submit.web-payment-button--google-pay').should('be.visible')
      cy.get('#google-pay-payment-method-submit.web-payment-button--google-pay').click()

      cy.wait('@second-web-payments-auth-request-which-fails')

      cy.get('[data-cy=error-summary]').find('li')
        .should('have.length', 1)
        .eq(0).should('have.text', 'No money has been taken from your account, please try again')

      cy.log('Should show Google Pay as a payment option and user chooses it again and fetch call succeeds')

      cy.get('#google-pay-payment-method-submit.web-payment-button--google-pay').should('be.visible')
      cy.get('#google-pay-payment-method-submit.web-payment-button--google-pay').click()

      cy.location().should((loc) => {
        expect(loc.pathname).to.eq('/humans.txt')
        expect(loc.search).to.eq('?confirm')
      })

      cy.task('clearStubs')
      cy.task('setupStubs', [...chargeStubsWithGooglePayOrApplePayEnabled(true, false), worldpay3dsFlexDdcStubFailure])

      cy.clearCookies()

      cy.visit(`/secure/${tokenId}`, {
        onBeforeLoad: win => {
          if (win.PaymentRequest) {
            cy.stub(win, 'PaymentRequest', getMockPaymentRequest(validPaymentRequestResponse))
          } else {
            win.PaymentRequest = getMockPaymentRequest(validPaymentRequestResponse)
          }
        }
      })

      cy.intercept(`/web-payments-auth-request/google/${chargeId}`, {
        method: 'POST',
        times: 1
      },
      {
        statusCode: 500
      }).as('first-web-payments-auth-request-which-fails')

      cy.log('Should show Google Pay as a payment option and user chooses it but DDC fails and the fetch call fails first time')

      cy.get('#google-pay-payment-method-submit.web-payment-button--google-pay').should('be.visible')
      cy.get('#google-pay-payment-method-submit.web-payment-button--google-pay').click()

      cy.wait('@first-web-payments-auth-request-which-fails')

      cy.get('#google-pay-payment-method-submit.web-payment-button--google-pay').should('be.visible')
      cy.get('#google-pay-payment-method-submit.web-payment-button--google-pay').click()

      cy.location().should((loc) => {
        expect(loc.pathname).to.eq('/humans.txt')
        expect(loc.search).to.eq('?confirm')
      })

      cy.task('clearStubs')
      cy.task('setupStubs', [...chargeStubsWithGooglePayOrApplePayEnabled(true, false), worldpay3dsFlexDdcStub])

      cy.clearCookies()

      cy.visit(`/secure/${tokenId}`, {
        onBeforeLoad: win => {
          if (win.PaymentRequest) {
            cy.stub(win, 'PaymentRequest', getMockPaymentRequest(validPaymentRequestResponse))
          } else {
            win.PaymentRequest = getMockPaymentRequest(validPaymentRequestResponse)
          }
        }
      })

      cy.get('#google-pay-payment-method-submit.web-payment-button--google-pay').should('be.visible')

      cy.log('Should show Google Pay as a payment option and user chooses standard method')

      cy.get('#card-no').should('be.visible')

      cy.intercept('POST', `/check_card/${chargeId}`).as('checkCard')

      cy.get('#card-no').type('4242424242424242')
      cy.get('#card-no').blur()

      cy.wait('@checkCard')

      cy.get('#expiry-month').type('10')
      cy.get('#expiry-year').type('50')
      cy.get('#cardholder-name').type('Ms. Test')
      cy.get('#cvc').type('123')
      cy.get('#address-line-1').type('1 Test Street')
      cy.get('#address-city').type('1 Test City')
      cy.get('#address-postcode').type('TE1 1ST')
      cy.get('#email').type('payer@payment.test')

      cy.get('#card-details').submit().should($form => {
        console.log('$$ $form: ', $form)
        const formVal = $form.first()[0].elements.worldpay3dsFlexDdcResult.value
        expect(formVal).to.eq(worldpaySessionId)
        const ddcStatusVal = $form.first()[0].elements.worldpay3dsFlexDdcStatus.value
        expect(ddcStatusVal).to.eq('valid DDC result')
      })

      cy.task('clearStubs')
      cy.task('setupStubs', [...chargeStubsWithGooglePayOrApplePayEnabled(true, false), worldpay3dsFlexDdcStub])

      cy.clearCookies()

      cy.visit(`/secure/${tokenId}`, {
        onBeforeLoad: win => {
          if (win.PaymentRequest) {
            cy.stub(win, 'PaymentRequest', getMockPaymentRequest(validPaymentRequestResponse))
          } else {
            win.PaymentRequest = getMockPaymentRequest(validPaymentRequestResponse)
          }
        }
      })

      cy.intercept(`/web-payments-auth-request/google/${chargeId}`, {
        method: 'POST',
        times: 1
      },
      {
        statusCode: 500
      }).as('first-web-payments-auth-request-which-fails')

      cy.log('Should show Google Pay as a payment option and user chooses it but fetch call fails so user uses standard method')

      cy.get('#google-pay-payment-method-submit.web-payment-button--google-pay').should('be.visible')
      cy.get('#google-pay-payment-method-submit.web-payment-button--google-pay').click()

      cy.wait('@first-web-payments-auth-request-which-fails')

      cy.get('#google-pay-payment-method-submit.web-payment-button--google-pay').should('be.visible')
      cy.get('#card-no').should('be.visible')

      cy.intercept('POST', `/check_card/${chargeId}`).as('checkCard')

      cy.get('#card-no').type('4242424242424242')
      cy.get('#card-no').blur()

      cy.wait('@checkCard')

      cy.get('#expiry-month').type('10')
      cy.get('#expiry-year').type('50')
      cy.get('#cardholder-name').type('Ms. Test')
      cy.get('#cvc').type('123')
      cy.get('#address-line-1').type('1 Test Street')
      cy.get('#address-city').type('1 Test City')
      cy.get('#address-postcode').type('TE1 1ST')
      cy.get('#email').type('payer@payment.test')

      cy.get('#card-details').submit().should($form => {
        const formVal = $form.first()[0].elements.worldpay3dsFlexDdcResult.value
        expect(formVal).to.eq(worldpaySessionId)
        const ddcStatusVal = $form.first()[0].elements.worldpay3dsFlexDdcStatus.value
        expect(ddcStatusVal).to.eq('valid DDC result')
      })

      cy.task('clearStubs')
      cy.task('setupStubs', [...chargeStubsWithGooglePayOrApplePayEnabled(false, false), worldpay3dsFlexDdcStub])

      cy.visit(`/card_details/${chargeId}`)

      cy.log('Should not show Google Pay as browser doesn’t support it')

      cy.get('#google-pay-payment-method-submit.web-payment-button--google-pay').should('not.exist')
      cy.get('#card-no').should('be.visible')

      cy.task('clearStubs')
      cy.task('setupStubs', [...chargeStubsWithGooglePayOrApplePayEnabled(true, false, true)])

      cy.visit(`/card_details/${chargeId}`)

      cy.log('Should not show Google Pay as payment is a recurring one')

      cy.get('#google-pay-payment-method-submit.web-payment-button--google-pay').should('not.exist')
    })

    it('Should show Google Pay as a payment option when Apple Pay is enabled for the service and allow user to use it', () => {
      cy.task('clearStubs')
      cy.task('setupStubs', [...chargeStubsWithGooglePayOrApplePayEnabled(false, false)])

      cy.visit(`/secure/${tokenId}`)
      cy.location('pathname').should('eq', `/card_details/${chargeId}`)

      cy.task('clearStubs')
      cy.task('setupStubs', [...chargeStubsWithGooglePayOrApplePayEnabled(true, true), worldpay3dsFlexDdcStub])

      cy.visit(`/card_details/${chargeId}`, {
        onBeforeLoad: win => {
          if (win.PaymentRequest) {
            cy.stub(win, 'PaymentRequest', getMockPaymentRequest(validPaymentRequestResponse))
          } else {
            win.PaymentRequest = getMockPaymentRequest(validPaymentRequestResponse)
          }
        }
      })

      cy.get('#google-pay-payment-method-submit.web-payment-button--google-pay').should('be.visible')
      cy.get('#google-pay-payment-method-submit.web-payment-button--google-pay').click()

      cy.location().should((loc) => {
        expect(loc.pathname).to.eq('/humans.txt')
        expect(loc.search).to.eq('?confirm')
      })
    })
  })
})
