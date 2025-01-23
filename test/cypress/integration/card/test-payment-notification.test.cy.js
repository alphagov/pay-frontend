const cardPaymentStubs = require('../../utils/card-payment-stubs')
const { adminUsersGetService } = require('../../utils/stub-builders/service-stubs')
const {
  connectorMultipleSubsequentChargeDetails,
  connectorValidPatchConfirmedChargeDetails
} = require('../../utils/stub-builders/charge-stubs')
const { cardIdValidCardDetails } = require('../../utils/stub-builders/card-id-stubs')

const tokenId = 'be88a908-3b99-4254-9807-c855d53f6b2b'
const chargeId = 'ub8de8r5mh4pb49rgm1ismaqfv'
const validPayment = {
  cardNumber: '4444333322221111',
  expiryMonth: '01',
  expiryYear: '30',
  name: 'S. McDuck',
  securityCode: '012',
  addressLine1: 'McDuck Manor',
  city: 'Duckburg',
  postcode: 'SW1A 1AA',
  email: 's.mcduck@example.com'
}
const createPaymentChargeStubsEnglish = (isLive) => {
  return cardPaymentStubs.buildCreatePaymentChargeStubs(tokenId, chargeId, 'en', 42, {}, {}, {
    gatewayAccountType: isLive ? 'live' : 'test'
  })
}
const checkCardDetailsStubs = (isLive) => {
  return cardPaymentStubs.checkCardDetailsStubs(chargeId, 42, {
    gatewayAccountType: isLive ? 'live' : 'test'
  })
}
const confirmPaymentDetailsStubs = (isLive) => {
  const gatewayAccountType = isLive ? 'live' : 'test'
  return [
    adminUsersGetService(),
    connectorMultipleSubsequentChargeDetails([
      {
        chargeId,
        status: 'AUTHORISATION READY',
        state: { finished: false, status: 'started' },
        gatewayAccountType
      },
      {
        chargeId,
        paymentDetails: validPayment,
        status: 'AUTHORISATION READY',
        state: { finished: false, status: 'submitted' },
        gatewayAccountType
      },
      {
        chargeId,
        paymentDetails: validPayment,
        status: 'AUTHORISATION SUCCESS',
        state: { finished: false, status: 'submitted' },
        gatewayAccountType
      },
      {
        chargeId,
        paymentDetails: validPayment,
        status: 'AUTHORISATION SUCCESS',
        state: { finished: false, status: 'submitted' },
        gatewayAccountType
      }
    ]),
    cardIdValidCardDetails(),
    connectorValidPatchConfirmedChargeDetails(chargeId)
  ]
}



describe('Card payment page', () => {
  describe('A test payment', () => {
    it('should show phase and notification banners', () => {
      cy.task('setupStubs', createPaymentChargeStubsEnglish(false))
      cy.visit(`/secure/${tokenId}`)
      cy.location('pathname').should('eq', `/card_details/${chargeId}`)
      shouldCheckPhaseBanner()
      shouldCheckNotificationBanner()
      cy.task('clearStubs')
      cy.task('setupStubs', checkCardDetailsStubs(false))
      shouldEnterCardDetails()
      cy.task('clearStubs')
      cy.task('setupStubs', confirmPaymentDetailsStubs(false))
      cy.get('#card-details').submit()
      cy.location('pathname').should('eq', `/card_details/${chargeId}/auth_waiting`)
      shouldCheckPhaseBanner()
      cy.get('p.lede').should('exist')
      cy.location('pathname').should('eq', `/card_details/${chargeId}/confirm`)
      shouldCheckPhaseBanner()
      shouldCheckNotificationBanner()
      cy.get('#expiry-date').should(($td) => expect($td).to.contain(`${validPayment.expiryMonth}/${validPayment.expiryYear}`))
      cy.get('#cardholder-name').should(($td) => expect($td).to.contain(validPayment.name))
    })
  })
  describe('A live payment', () => {
    it('should not show phase and notification banners', () => {
      cy.task('setupStubs', createPaymentChargeStubsEnglish(true))
      cy.visit(`/secure/${tokenId}`)
      cy.location('pathname').should('eq', `/card_details/${chargeId}`)
      cy.get('.govuk-phase-banner')
        .should('not.exist')
      cy.get('.govuk-notification-banner')
        .should('not.exist')
      cy.task('clearStubs')
      cy.task('setupStubs', checkCardDetailsStubs(true))
      shouldEnterCardDetails()
      cy.task('clearStubs')
      cy.task('setupStubs', confirmPaymentDetailsStubs(true))
      cy.get('#card-details').submit()
      cy.location('pathname').should('eq', `/card_details/${chargeId}/auth_waiting`)
      cy.get('.govuk-phase-banner')
        .should('not.exist')
      cy.get('p.lede').should('exist')
      cy.location('pathname').should('eq', `/card_details/${chargeId}/confirm`)
      cy.get('.govuk-phase-banner')
        .should('not.exist')
      cy.get('.govuk-notification-banner')
        .should('not.exist')
      cy.get('#expiry-date').should(($td) => expect($td).to.contain(`${validPayment.expiryMonth}/${validPayment.expiryYear}`))
      cy.get('#cardholder-name').should(($td) => expect($td).to.contain(validPayment.name))
    })
  })
})

function shouldCheckPhaseBanner () {
  cy.get('.govuk-phase-banner')
    .should('exist')
    .should('contain.text', 'Test service')
    .should('contain.text', 'This is a test payment service.')
}

function shouldCheckNotificationBanner () {
  cy.get('.govuk-notification-banner')
    .should('exist')
    .find('p.govuk-notification-banner__heading')
    .should('contain.text', 'This is a test page. No money will be taken.')
    .parent()
    .find('p.govuk-body')
    .should('contain.text', 'Contact the service you’re trying to pay for if you are trying to make a payment.')
}

function shouldEnterCardDetails () {
  cy.intercept('POST', `/check_card/${chargeId}`).as('checkCard')
  cy.log('Should enter card details')
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
}
