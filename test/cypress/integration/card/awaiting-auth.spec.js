const cardPaymentStubs = require('../../utils/card-payment-stubs')

const tokenId = 'be88a908-3b99-4254-9807-c855d53f6b2b'
const chargeId = 'ub8de8r5mh4pb49rgm1ismaqfv'
const createPaymentChargeStubs = cardPaymentStubs.buildCreatePaymentChargeStubs(tokenId, chargeId, 'en')
const checkCardDetailsStubs = cardPaymentStubs.checkCardDetailsStubs(chargeId)

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
  beforeEach(() => {
    // this test is for the full process, the session should be maintained
    // as it would for an actual payment flow
    Cypress.Cookies.preserveOnce('frontend_state')
  })

  it('Should setup the payment and load the page', () => {
    cy.task('setupStubs', createPaymentChargeStubs)
    cy.visit(`/secure/${tokenId}`)

    cy.location('pathname').should('eq', `/card_details/${chargeId}`)
    cy.window().its('chargeId').should('eq', `${chargeId}`)
  })

  it('Should enter card details', () => {
    cy.task('setupStubs', checkCardDetailsStubs)

    cy.server()
    cy.route('POST', `/check_card/${chargeId}`).as('checkCard')

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
  })

  it('Submitting confirmation should redirect to auth waiting page', () => {
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
      { name: 'adminUsersGetService', opts: {} },
      {
        name: 'connectorMultipleSubsequentChargeDetails',
        opts: [
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
          }]
      },
      { name: 'cardIdValidCardDetails' },
      { name: 'connectorValidPatchConfirmedChargeDetails', opts: { chargeId } }
    ]

    cy.task('setupStubs', confirmPaymentDetailsStubs)
    cy.get('#card-details').submit()

    cy.location('pathname').should('eq', `/card_details/${chargeId}/auth_waiting`)
    cy.get('p.lede').should('exist')

    cy.location('pathname').should('eq', `/card_details/${chargeId}/confirm`)
    cy.get('#expiry-date').should(($td) => expect($td).to.contain(`${validPayment.expiryMonth}/${validPayment.expiryYear}`))
    cy.get('#cardholder-name').should(($td) => expect($td).to.contain(validPayment.name))
  })
})
