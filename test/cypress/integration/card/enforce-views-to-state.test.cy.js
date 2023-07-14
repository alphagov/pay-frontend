const cardPaymentStubs = require('../../utils/card-payment-stubs')

const tokenId = 'be88a908-3b99-4254-9807-c855d53f6b2b'
const chargeId = 'ub8de8r5mh4pb49rgm1ismaqfv'
const createPaymentChargeStubs = cardPaymentStubs.buildCreatePaymentChargeStubs(tokenId, chargeId, 'en')
const checkCardDetailsStubs = cardPaymentStubs.checkCardDetailsStubs(chargeId)
const { connectorGetChargeDetails } = require('../../utils/stub-builders/charge-stubs')

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
const confirmPaymentDetailsStubs = cardPaymentStubs.confirmPaymentDetailsStubs(chargeId, validPayment)

const backButtonStubs = [
  connectorGetChargeDetails({
    chargeId,
    paymentDetails: validPayment,
    status: 'AUTHORISATION SUCCESS',
    state: { finished: false, status: 'submitted' }
  })
]

describe('Enforce views to state', () => {
  it('Should not allow the user to access the previous card details page', () => {
    cy.task('setupStubs', createPaymentChargeStubs)
    cy.visit(`/secure/${tokenId}`)

    cy.location('pathname').should('eq', `/card_details/${chargeId}`)
    cy.window().its('chargeId').should('eq', `${chargeId}`)

    cy.task('clearStubs')
    cy.task('setupStubs', checkCardDetailsStubs)

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

    cy.task('clearStubs')
    cy.task('setupStubs', confirmPaymentDetailsStubs)

    cy.log('Submitting confirmation with valid details should redirect to confirmation page')

    cy.get('#card-details').submit()

    cy.location('pathname').should('eq', `/card_details/${chargeId}/confirm`)

    const lastFourCardDigits = validPayment.cardNumber.substr(-4)
    cy.get('#card-number').should(($td) => expect($td).to.contain(`●●●●●●●●●●●●${lastFourCardDigits}`))
    cy.get('#expiry-date').should(($td) => expect($td).to.contain(`${validPayment.expiryMonth}/${validPayment.expiryYear}`))
    cy.get('#cardholder-name').should(($td) => expect($td).to.contain(validPayment.name))
    cy.get('#address').should(($td) => expect($td).to.contain(validPayment.addressLine1))
    cy.get('#email').should(($td) => expect($td).to.contain(validPayment.email))

    cy.task('clearStubs')
    cy.task('setupStubs', backButtonStubs)

    cy.log('Should not allow the user to access the previous card details page')

    cy.go('back')
    cy.get('#confirm-link').click()

    cy.get('#card-number').should(($td) => expect($td).to.contain(`●●●●●●●●●●●●${lastFourCardDigits}`))
    cy.get('#expiry-date').should(($td) => expect($td).to.contain(`${validPayment.expiryMonth}/${validPayment.expiryYear}`))
    cy.get('#cardholder-name').should(($td) => expect($td).to.contain(validPayment.name))
    cy.get('#address').should(($td) => expect($td).to.contain(validPayment.addressLine1))
    cy.get('#email').should(($td) => expect($td).to.contain(validPayment.email))
  })
})
