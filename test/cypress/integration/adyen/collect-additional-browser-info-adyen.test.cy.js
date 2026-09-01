const cardPaymentStubs = require('../../utils/card-payment-stubs')

describe('Enter card details page - browser info collection', () => {
  const tokenId = 'be88a908-3b99-4254-9807-c855d53f6b2b'
  const chargeId = 'ub8de8r5mh4pb49rgm1ismaqfv'
  const gatewayAccountId = 42
  const sessionOpts = {}

  it('should collect extra browser information for an Adyen non-MOTO payment', () => {
    const validPayment = {
      cardNumber: '4444333322221111',
      expiryMonth: '01',
      expiryYear: '30',
      name: 'Valid Paying Name',
      securityCode: '012',
      addressLine1: '10 Valid Paying Address',
      city: 'London',
      postcode: 'E1 8QS',
      email: 'test@test.test'
    }

    const checkCardDetailsStubs = cardPaymentStubs.checkCardDetailsStubs(chargeId)
    const confirmPaymentDetailsStubs = cardPaymentStubs.confirmPaymentDetailsStubs(chargeId, validPayment, gatewayAccountId)

    const providerOpts = {
      paymentProvider: 'adyen'
    }
    const createPaymentChargeStubsEnglish = cardPaymentStubs.buildCreatePaymentChargeStubs(tokenId, chargeId,
      'en', gatewayAccountId, sessionOpts, providerOpts, {}, { moto: false })
    cy.task('setupStubs', createPaymentChargeStubsEnglish)
    cy.visit(`/secure/${tokenId}`)

    // 1. Charge will be created using this id as a token (GET)
    // 2. Token will be deleted (DELETE)
    // 3. Charge will be fetched (GET)
    // 4. Service related to charge will be fetched (GET)
    // 5. Charge status will be updated (PUT)
    // 6. Client will be redirected to /card_details/:chargeId (304)
    cy.location('pathname').should('eq', `/card_details/${chargeId}`)

    cy.window().then($win => {
      cy.get('#card-details input[name=jsScreenColorDepth]').should('exist')
      cy.get('#card-details input[name=jsScreenColorDepth]').should('have.attr', 'value', $win.screen.colorDepth.toString())

      cy.get('#card-details input[name=jsScreenHeight]').should('exist')
      cy.get('#card-details input[name=jsScreenHeight]').should('have.attr', 'value', $win.screen.height.toString())

      cy.get('#card-details input[name=jsScreenWidth]').should('exist')
      cy.get('#card-details input[name=jsScreenWidth]').should('have.attr', 'value', $win.screen.width.toString())

      const now = new Date()
      cy.get('#card-details input[name=jsTimezoneOffsetMins]').should('exist')
      cy.get('#card-details input[name=jsTimezoneOffsetMins]').should('have.attr', 'value', now.getTimezoneOffset().toString())

      cy.get('#card-details input[name=jsNavigatorLanguage]').should('exist')
      cy.get('#card-details input[name=jsNavigatorLanguage]').should('have.attr', 'value', $win.navigator.language.toString())

      cy.get('#card-details input[name=jsEnabled]').should('exist')
      cy.get('#card-details input[name=jsEnabled]').should('have.attr', 'value', 'true')
    })

    cy.log('Submitting valid payment details to check the hidden form fields are processed without error')

    cy.task('clearStubs')
    cy.task('setupStubs', checkCardDetailsStubs)

    cy.intercept('POST', `/check_card/${chargeId}`).as('checkCard')

    cy.get('#card-no').type(validPayment.cardNumber)
    cy.get('#card-no').blur()
    cy.wait('@checkCard')
    cy.get('#expiry-month').type(validPayment.expiryMonth)
    cy.get('#expiry-year').type(validPayment.expiryYear)
    cy.get('#cardholder-name').type(validPayment.name)
    cy.get('#cvc').type(validPayment.securityCode)
    cy.get('#address-line-1').type(validPayment.addressLine1)
    cy.get('#address-city').type(validPayment.city)
    cy.get('#address-postcode').type(validPayment.postcode)
    cy.get('#email').type(validPayment.email)

    cy.task('clearStubs')
    cy.task('setupStubs', confirmPaymentDetailsStubs)

    cy.get('#card-details').submit()
    cy.location('pathname').should('eq', `/card_details/${chargeId}/confirm`)
    cy.get('#confirm').should('exist')
  })

  it('should not collect extra browser information on the page for an Adyen MOTO payment', () => {
    const providerOpts = {
      paymentProvider: 'adyen'
    }
    const createPaymentChargeStubsEnglish = cardPaymentStubs.buildCreatePaymentChargeStubs(
      tokenId, chargeId, 'en', gatewayAccountId, sessionOpts, providerOpts,
      {}, { moto: true })
    cy.task('setupStubs', createPaymentChargeStubsEnglish)
    cy.visit(`/secure/${tokenId}`)

    // 1. Charge will be created using this id as a token (GET)
    // 2. Token will be deleted (DELETE)
    // 3. Charge will be fetched (GET)
    // 4. Service related to charge will be fetched (GET)
    // 5. Charge status will be updated (PUT)
    // 6. Client will be redirected to /card_details/:chargeId (304)
    cy.location('pathname').should('eq', `/card_details/${chargeId}`)

    cy.window().then($win => {
      cy.get('#card-details input[name=jsScreenColorDepth]').should('not.exist')
      cy.get('#card-details input[name=jsScreenHeight]').should('not.exist')
      cy.get('#card-details input[name=jsScreenWidth]').should('not.exist')
      cy.get('#card-details input[name=jsTimezoneOffsetMins]').should('not.exist')
      cy.get('#card-details input[name=jsNavigatorLanguage]').should('not.exist')
      cy.get('#card-details input[name=jsEnabled]').should('not.exist')
    })
  })
  it('should not collect extra browser information on the page if payment provider is NOT Adyen', () => {
    const providerOpts = {
      paymentProvider: 'worldpay'
    }
    const createPaymentChargeStubsEnglish = cardPaymentStubs.buildCreatePaymentChargeStubs(
      tokenId, chargeId, 'en', gatewayAccountId, sessionOpts, providerOpts,
      {}, { moto: false })
    cy.task('setupStubs', createPaymentChargeStubsEnglish)
    cy.visit(`/secure/${tokenId}`)

    // 1. Charge will be created using this id as a token (GET)
    // 2. Token will be deleted (DELETE)
    // 3. Charge will be fetched (GET)
    // 4. Service related to charge will be fetched (GET)
    // 5. Charge status will be updated (PUT)
    // 6. Client will be redirected to /card_details/:chargeId (304)
    cy.location('pathname').should('eq', `/card_details/${chargeId}`)

    cy.window().then($win => {
      cy.get('#card-details input[name=jsScreenColorDepth]').should('not.exist')
      cy.get('#card-details input[name=jsScreenHeight]').should('not.exist')
      cy.get('#card-details input[name=jsScreenWidth]').should('not.exist')
      cy.get('#card-details input[name=jsTimezoneOffsetMins]').should('not.exist')
      cy.get('#card-details input[name=jsNavigatorLanguage]').should('not.exist')
      cy.get('#card-details input[name=jsEnabled]').should('not.exist')
    })
  })
})
