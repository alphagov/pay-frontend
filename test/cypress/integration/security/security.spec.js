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
    beforeEach(() => {
        // Set up the proxy for ZAP if specified
        const zapProxy = Cypress.env('zapProxy')
        const mountebankURL = Cypress.env('MOUNTEBANK_URL')
        
        if (zapProxy) {
            cy.intercept('*', (req) => {
                // Allow Mountebank requests to bypass the proxy
                console.log('Intercepted request:', req);
                if (!req.url.includes(mountebankURL)) {
                    req.headers['Proxy'] = zapProxy;
                }
            })
        }
    })

    it('should load the page', () => {
        cy.log('Should setup the payment and load the page')
        cy.task('setupStubs', createPaymentChargeStubs)
        cy.visit(`/secure/${tokenId}`)
    
        cy.location('pathname').should('eq', `/card_details/${chargeId}`)
        cy.window().its('chargeId').should('eq', `${chargeId}`)
    
        cy.task('clearStubs')
        cy.task('setupStubs', checkCardDetailsStubs)
    
        cy.intercept('POST', `/check_card/${chargeId}`).as('checkCard')
        })
})