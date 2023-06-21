const cardPaymentStubs = require('../../utils/card-payment-stubs')

describe('Enter card details page', () => {
  const tokenId = 'be88a908-3b99-4254-9807-c855d53f6b2b'
  const chargeId = 'ub8de8r5mh4pb49rgm1ismaqfv'
  const gatewayAccountId = 42
  const sessionOpts = {}

  const setUpAndCheckCardPaymentPage = () => {
    describe('ePDQ gateway account with 3DS2 enabled', () => {
      const providerOpts = {
        paymentProvider: 'epdq',
        requires3ds: true,
        integrationVersion3ds: 2
      }
      const createPaymentChargeStubsEnglish = cardPaymentStubs.buildCreatePaymentChargeStubs(tokenId, chargeId, 'en', gatewayAccountId, sessionOpts, providerOpts)
      it('Should have extra browser information on the page for ePDQ 3DS2', () => {
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
        })
      })
    })

    describe('ePDQ gateway account with 3DS1 enabled', () => {
      const providerOpts = {
        paymentProvider: 'epdq',
        requires3ds: true,
        integrationVersion3ds: 1
      }
      const createPaymentChargeStubsEnglish = cardPaymentStubs.buildCreatePaymentChargeStubs(tokenId, chargeId, 'en', gatewayAccountId, sessionOpts, providerOpts)
      it('Should NOT have extra browser information on the page for ePDQ 3DS2', () => {
        cy.task('setupStubs', createPaymentChargeStubsEnglish)
        cy.visit(`/secure/${tokenId}`)

        // 1. Charge will be created using this id as a token (GET)
        // 2. Token will be deleted (DELETE)
        // 3. Charge will be fetched (GET)
        // 4. Service related to charge will be fetched (GET)
        // 5. Charge status will be updated (PUT)
        // 6. Client will be redirected to /card_details/:chargeId (304)
        cy.location('pathname').should('eq', `/card_details/${chargeId}`)

        cy.get('#card-details input[name=jsScreenColorDepth]').should('not.exist')
        cy.get('#card-details input[name=jsScreenHeight]').should('not.exist')
        cy.get('#card-details input[name=jsScreenWidth]').should('not.exist')
        cy.get('#card-details input[name=jsTimezoneOffsetMins]').should('not.exist')
        cy.get('#card-details input[name=jsNavigatorLanguage]').should('not.exist')
      })
    })

    describe('ePDQ gateway account with 3DS disabled', () => {
      const providerOpts = {
        paymentProvider: 'epdq',
        requires3ds: false,
        integrationVersion3ds: 2
      }
      const createPaymentChargeStubsEnglish = cardPaymentStubs.buildCreatePaymentChargeStubs(tokenId, chargeId, 'en', gatewayAccountId, sessionOpts, providerOpts)
      it('Should NOT have extra browser information on the page for ePDQ 3DS2', () => {
        cy.task('setupStubs', createPaymentChargeStubsEnglish)
        cy.visit(`/secure/${tokenId}`)

        // 1. Charge will be created using this id as a token (GET)
        // 2. Token will be deleted (DELETE)
        // 3. Charge will be fetched (GET)
        // 4. Service related to charge will be fetched (GET)
        // 5. Charge status will be updated (PUT)
        // 6. Client will be redirected to /card_details/:chargeId (304)
        cy.location('pathname').should('eq', `/card_details/${chargeId}`)

        cy.get('#card-details input[name=jsScreenColorDepth]').should('not.exist')
        cy.get('#card-details input[name=jsScreenHeight]').should('not.exist')
        cy.get('#card-details input[name=jsScreenWidth]').should('not.exist')
        cy.get('#card-details input[name=jsTimezoneOffsetMins]').should('not.exist')
        cy.get('#card-details input[name=jsNavigatorLanguage]').should('not.exist')
      })
    })

    describe('Worldpay gateway account with 3DS2 enabled', () => {
      const providerOpts = {
        paymentProvider: 'worldpay',
        requires3ds: false,
        integrationVersion3ds: 2
      }
      const createPaymentChargeStubsEnglish = cardPaymentStubs.buildCreatePaymentChargeStubs(tokenId, chargeId, 'en', gatewayAccountId, sessionOpts, providerOpts)
      it('Should NOT have extra browser information on the page for ePDQ 3DS2', () => {
        cy.task('setupStubs', createPaymentChargeStubsEnglish)
        cy.visit(`/secure/${tokenId}`)

        // 1. Charge will be created using this id as a token (GET)
        // 2. Token will be deleted (DELETE)
        // 3. Charge will be fetched (GET)
        // 4. Service related to charge will be fetched (GET)
        // 5. Charge status will be updated (PUT)
        // 6. Client will be redirected to /card_details/:chargeId (304)
        cy.location('pathname').should('eq', `/card_details/${chargeId}`)

        cy.get('#card-details input[name=jsScreenColorDepth]').should('not.exist')
        cy.get('#card-details input[name=jsScreenHeight]').should('not.exist')
        cy.get('#card-details input[name=jsScreenWidth]').should('not.exist')
        cy.get('#card-details input[name=jsTimezoneOffsetMins]').should('not.exist')
        cy.get('#card-details input[name=jsNavigatorLanguage]').should('not.exist')
      })
    })
  }

  setUpAndCheckCardPaymentPage()
})
