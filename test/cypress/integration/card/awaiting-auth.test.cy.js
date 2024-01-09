const cardPaymentStubs = require('../../utils/card-payment-stubs')

const tokenId = 'be88a908-3b99-4254-9807-c855d53f6b2b'
const chargeId = 'ub8de8r5mh4pb49rgm1ismaqfv'
const createPaymentChargeStubs = cardPaymentStubs.buildCreatePaymentChargeStubs(tokenId, chargeId, 'en')
const checkCardDetailsStubs = cardPaymentStubs.checkCardDetailsStubs(chargeId)
const { adminUsersGetService } = require('../../utils/stub-builders/service-stubs')
const { cardIdValidCardDetails } = require('../../utils/stub-builders/card-id-stubs')
const { connectorMultipleSubsequentChargeDetails, connectorValidPatchConfirmedChargeDetails } = require('../../utils/stub-builders/charge-stubs')

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

describe('Awaiting auth', () => {
  it.only('should load the auth waiting page and redirect to confirm page when card details are entered', () => {
    cy.log('Should setup the payment and load the page')
    cy.task('setupStubs', createPaymentChargeStubs)
    cy.visit(`/secure/${tokenId}`)

    cy.location('pathname').should('eq', `/card_details/${chargeId}`)
    cy.window().its('chargeId').should('eq', `${chargeId}`)

    cy.task('clearStubs')
    cy.task('setupStubs', checkCardDetailsStubs)

    cy.intercept('POST', `/check_card/${chargeId}`).as('checkCard')

    cy.log('Should enter card details')

    cy.percySnapshot()

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

    const paymentDetails = {
      cardNumber: validPayment.cardNumber,
      expiryMonth: validPayment.expiryMonth,
      expiryYear: validPayment.expiryYear,
      name: validPayment.name,
      securityCode: validPayment.securityCode,
      addressLine1: validPayment.addressLine1,
      city: validPayment.city,
      postcode: validPayment.postcode,
      email: validPayment.email
    }

    const confirmPaymentDetailsStubs = [
      adminUsersGetService(),
      connectorMultipleSubsequentChargeDetails([
        {
          chargeId,
          status: 'AUTHORISATION READY',
          state: { finished: false, status: 'started' }
        },
        // the charge below needs to have AUTHORISATION READY status to force the page to the auth_waiting page
        {
          chargeId,
          paymentDetails: paymentDetails,
          status: 'AUTHORISATION READY',
          state: { finished: false, status: 'submitted' }
        },
        // status of AUTHORISATION SUCCESS to move the page from auth_waiting to confirm page
        {
          chargeId,
          paymentDetails: paymentDetails,
          status: 'AUTHORISATION SUCCESS',
          state: { finished: false, status: 'submitted' }
        },
        // another charge below to satisfy the state enforcer so we go to the correct confirm page
        {
          chargeId,
          paymentDetails: paymentDetails,
          status: 'AUTHORISATION SUCCESS',
          state: { finished: false, status: 'submitted' }
        }
      ]),
      cardIdValidCardDetails(),
      connectorValidPatchConfirmedChargeDetails(chargeId)
    ]

    cy.task('clearStubs')
    cy.task('setupStubs', confirmPaymentDetailsStubs)

    cy.log('Submitting confirmation should redirect to auth waiting page')

    cy.get('#card-details').submit()

    cy.location('pathname').should('eq', `/card_details/${chargeId}/auth_waiting`)
    cy.get('p.lede').should('exist')

    cy.location('pathname').should('eq', `/card_details/${chargeId}/confirm`)
    cy.get('#expiry-date').should(($td) => expect($td).to.contain(`${validPayment.expiryMonth}/${validPayment.expiryYear}`))
    cy.get('#cardholder-name').should(($td) => expect($td).to.contain(validPayment.name))
  })
})
