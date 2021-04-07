const cardPaymentStubs = require('../../utils/card-payment-stubs')
const gatewayAccountId = 42

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

  const createPaymentChargeStubsNoMoto = cardPaymentStubs.buildCreatePaymentChargeStubs(
    tokenId, chargeId, 'en', gatewayAccountId, {}, {}, {}, {
      moto: false
    })

  const createPaymentChargeStubsNoMotoMaskCardNumberAndSecurityCode = cardPaymentStubs.buildCreatePaymentChargeStubs(
    tokenId, chargeId, 'en', gatewayAccountId, {}, {}, {
      motoMaskCardNumberInput: true,
      motoMaskCardSecurityCodeInput: true
    },
    {
      moto: false
    })

  const createPaymentChargeStubsNoMotoGatewayMotoMaskCardNumberAndSecurityCode = cardPaymentStubs.buildCreatePaymentChargeStubs(
    tokenId, chargeId, 'en', gatewayAccountId, {}, {}, {
      allowMoto: true,
      motoMaskCardNumberInput: true,
      motoMaskCardSecurityCodeInput: true
    },
    {
      moto: false
    })

  const createPaymentChargeStubsMotoMaskCardNumberOnly = cardPaymentStubs.buildCreatePaymentChargeStubs(
    tokenId, chargeId, 'en', gatewayAccountId, {}, {}, {
      motoMaskCardNumberInput: true
    },
    {
      moto: true
    })

  const createPaymentChargeStubsMotoMaskSecurityCodeOnly = cardPaymentStubs.buildCreatePaymentChargeStubs(
    tokenId, chargeId, 'en', gatewayAccountId, {}, {}, {
      allowMoto: true,
      motoMaskCardSecurityCodeInput: true
    },
    {
      moto: true
    })

  const createPaymentChargeStubsMotoMaskCardNumberAndSecurityCode = cardPaymentStubs.buildCreatePaymentChargeStubs(
    tokenId, chargeId, 'en', gatewayAccountId, {}, {}, {
      motoMaskCardNumberInput: true,
      motoMaskCardSecurityCodeInput: true
    },
    {
      moto: true
    })

  const checkCardDetailsStubs = cardPaymentStubs.checkCardDetailsStubs(chargeId)

  const confirmPaymentDetailsStubs = cardPaymentStubs.confirmPaymentDetailsStubs(chargeId, validPayment, {},
    {
      moto: true
    })

  beforeEach(() => {
    // this test is for the full process, the session should be maintained
    // as it would for an actual payment flow
    Cypress.Cookies.preserveOnce('frontend_state')
  })

  describe('Secure card payment page - MOTO NOT enabled', () => {
    it('Should setup the payment and load the page', () => {
      cy.task('setupStubs', createPaymentChargeStubsNoMoto)
      cy.visit(`/secure/${tokenId}`)

      cy.location('pathname').should('eq', `/card_details/${chargeId}`)
      cy.window().its('chargeId').should('eq', `${chargeId}`)
    })

    it('Card number & security code input elements should NOT mask digits', () => {
      cy.get('#card-no').invoke('attr', 'type').should('eq', 'text')
      cy.get('#card-no').invoke('attr', 'autocomplete').should('eq', 'cc-number')

      cy.get('#cvc').invoke('attr', 'type').should('eq', 'text')
      cy.get('#cvc').invoke('attr', 'autocomplete').should('eq', 'cc-csc')
    })
  })

  describe('Secure card payment page - MOTO NOT enabled but masking set for both card number and security code', () => {
    it('Should setup the payment and load the page', () => {
      cy.task('setupStubs', createPaymentChargeStubsNoMotoMaskCardNumberAndSecurityCode)
      cy.visit(`/secure/${tokenId}`)

      cy.location('pathname').should('eq', `/card_details/${chargeId}`)
      cy.window().its('chargeId').should('eq', `${chargeId}`)
    })

    it('Card number & security code input elements should NOT mask digits as it is not a MOTO service', () => {
      cy.get('#card-no').invoke('attr', 'type').should('eq', 'text')
      cy.get('#card-no').invoke('attr', 'autocomplete').should('eq', 'cc-number')

      cy.get('#cvc').invoke('attr', 'type').should('eq', 'text')
      cy.get('#cvc').invoke('attr', 'autocomplete').should('eq', 'cc-csc')
    })
  })

  describe('Secure card payment page - MOTO NOT enabled but gateway account is MOTO enabled and masking set for both card number and security code', () => {
    it('Should setup the payment and load the page', () => {
      cy.task('setupStubs', createPaymentChargeStubsNoMotoGatewayMotoMaskCardNumberAndSecurityCode)
      cy.visit(`/secure/${tokenId}`)

      cy.location('pathname').should('eq', `/card_details/${chargeId}`)
      cy.window().its('chargeId').should('eq', `${chargeId}`)
    })

    it('Card number & security code input elements should NOT mask digits as MOTO is false for this charge', () => {
      cy.get('#card-no').invoke('attr', 'type').should('eq', 'text')
      cy.get('#card-no').invoke('attr', 'autocomplete').should('eq', 'cc-number')

      cy.get('#cvc').invoke('attr', 'type').should('eq', 'text')
      cy.get('#cvc').invoke('attr', 'autocomplete').should('eq', 'cc-csc')
    })
  })

  describe('Secure card payment page - with MOTO and only masking card number', () => {
    it('Should setup the payment and load the page', () => {
      cy.task('setupStubs', createPaymentChargeStubsMotoMaskCardNumberOnly)
      cy.visit(`/secure/${tokenId}`)

      cy.location('pathname').should('eq', `/card_details/${chargeId}`)
      cy.window().its('chargeId').should('eq', `${chargeId}`)
    })

    it('Should only setup the card number input field to mask input', () => {
      cy.get('#card-no').invoke('attr', 'type').should('eq', 'password')
      cy.get('#card-no').invoke('attr', 'autocomplete').should('eq', 'off')

      cy.get('#cvc').invoke('attr', 'type').should('eq', 'text')
      cy.get('#cvc').invoke('attr', 'autocomplete').should('eq', 'cc-csc')
    })

    it('should allow a valid card number to be entered', () => {
      cy.task('setupStubs', checkCardDetailsStubs)

      cy.server()
      cy.route('POST', `/check_card/${chargeId}`).as('checkCard')

      cy.get('#card-no').type(validPayment.cardNumber)
      cy.get('#card-no').blur()

      cy.wait('@checkCard')
      cy.get('#card-no').should('not.have.class', 'govuk-input--error')
    })

    it('should display an error when a invalid card number is entered', () => {
      cy.task('setupStubs', checkCardDetailsStubs)

      cy.server()
      cy.route('POST', `/check_card/${chargeId}`).as('checkCard')

      cy.get('#card-no').type('1234567890')
      cy.get('#card-no').blur()

      cy.wait('@checkCard')
      cy.get('#card-no').should('have.class', 'govuk-input--error')
      cy.get('#card-no-lbl').should('contain', 'Card number is not the correct length')
    })
  })

  describe('Secure card payment page - with MOTO and only masking security code', () => {
    it('Should setup the payment and load the page', () => {
      cy.task('setupStubs', createPaymentChargeStubsMotoMaskSecurityCodeOnly)
      cy.visit(`/secure/${tokenId}`)

      cy.location('pathname').should('eq', `/card_details/${chargeId}`)
      cy.window().its('chargeId').should('eq', `${chargeId}`)
    })

    it('Should only setup the security code input field to mask input', () => {
      cy.get('#card-no').invoke('attr', 'type').should('eq', 'text')
      cy.get('#card-no').invoke('attr', 'autocomplete').should('eq', 'cc-number')

      cy.get('#cvc').invoke('attr', 'type').should('eq', 'password')
      cy.get('#cvc').invoke('attr', 'autocomplete').should('eq', 'off')
    })

    it('should allow a valid security code to be entered', () => {
      cy.get('#cvc').clear()
      cy.get('#cvc').type(validPayment.securityCode)
      cy.get('#cvc').blur()

      cy.get('#cvc').should('not.have.class', 'govuk-input--error')
    })

    it('should display an error when a invalid security code is entered', () => {
      cy.get('#cvc').clear()
      cy.get('#cvc').type('11')
      cy.get('#cvc').blur()

      cy.get('#cvc').should('have.class', 'govuk-input--error')
      cy.get('#cvc-lbl').should('contain', 'Enter a valid card security code')
    })
  })

  describe('Secure card payment page - with MOTO and masking both card number and security code', () => {
    it('Should setup the payment and load the page', () => {
      cy.task('setupStubs', createPaymentChargeStubsMotoMaskCardNumberAndSecurityCode)
      cy.visit(`/secure/${tokenId}`)

      cy.location('pathname').should('eq', `/card_details/${chargeId}`)
      cy.window().its('chargeId').should('eq', `${chargeId}`)
    })

    it('Card number & security code input elements should mask digits', () => {
      cy.get('#card-no').invoke('attr', 'type').should('eq', 'password')
      cy.get('#card-no').invoke('attr', 'autocomplete').should('eq', 'off')

      cy.get('#cvc').invoke('attr', 'type').should('eq', 'password')
      cy.get('#cvc').invoke('attr', 'autocomplete').should('eq', 'off')
    })

    it('Should enter and validate a correct card', () => {
      cy.task('setupStubs', checkCardDetailsStubs)

      cy.server()
      cy.route('POST', `/check_card/${chargeId}`).as('checkCard')

      cy.get('#card-no').type(validPayment.cardNumber)
      cy.get('#card-no').blur()

      cy.wait('@checkCard')
      cy.get('#card-no').should('not.have.class', 'govuk-input--error')
    })

    it('Should enter payment details', () => {
      cy.get('#expiry-month').type(validPayment.expiryMonth)
      cy.get('#expiry-year').type(validPayment.expiryYear)
      cy.get('#cardholder-name').type(validPayment.name)
      cy.get('#cvc').type(validPayment.securityCode)
      cy.get('#email').type(validPayment.email)
    })
  })

  describe('Secure confirmation page', () => {
    it('Submitting confirmation with valid details should redirect to confirmation page', () => {
      const lastFourCardDigits = validPayment.cardNumber.substr(-4)

      cy.task('setupStubs', confirmPaymentDetailsStubs)
      cy.get('#card-details').submit()

      // TD inner values are padded with white space - generic match
      cy.get('#card-number').should(($td) => expect($td).to.contain(`●●●●●●●●●●●●${lastFourCardDigits}`))
      cy.get('#cardholder-name').should(($td) => expect($td).to.contain(validPayment.name))
      cy.get('#email').should(($td) => expect($td).to.contain(validPayment.email))
    })
  })
})
