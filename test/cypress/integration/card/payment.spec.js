describe('Standard card payment flow', () => {
  // @TODO(sfount) charge id should be driven by external id exposed through toke fixture
  const tokenId = 'be88a908-3b99-4254-9807-c855d53f6b2b'
  const chargeId = 'ub8de8r5mh4pb49rgm1ismaqfv'

  beforeEach(() => {
    cy.task('setupStubs', [
      { name: 'getValidChargeCreated', opts: { tokenId } },
      { name: 'getValidTokenDeleted', opts: { tokenId } },
      { name: 'getValidInitialCharge', opts: { chargeId } },
      { name: 'putValidInitialChargeStatus', opts: { chargeId } },

      // note this should pass the service to be queried relative to the charge
      // right now it just returns a default service
      { name: 'getValidInitialService', opts: {} }
    ])
  })

  describe('Secure card payment page', () => {
    it('Should load the page', () => {
      cy.visit(`/secure/${tokenId}`)

      // The following expected behaviours should be triggered
      // 1. Charge will be created using this id as a token
      // 2. Token will be deleted
      // 3. Charge will be fetched
      // 4. Service related to charge will be fetched
      // 5. Client will be redirected to /card_details/:chargeId

      // something
    })
  })
})
