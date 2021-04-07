'use strict'

const proxyquire = require('proxyquire')
const sinon = require('sinon')
const { expect } = require('chai')

const { validDdcJwt } = require('../fixtures/worldpay-3ds-flex.fixtures')

const TEST_JWT = 'a-jwt-returned-from-connector'

const requireService = function (mockedConnectorClient) {
  return proxyquire('../../app/services/worldpay-3ds-flex.service', {
    './clients/connector.client': mockedConnectorClient
  })
}

describe('Worldpay 3DS Flex service', () => {
  let service
  let connectorClientStub
  let getWorldpay3dsFlexJwtStub

  describe('get DDC JWT success', () => {
    beforeEach(() => {
      const jwtResponse = validDdcJwt(TEST_JWT)
      getWorldpay3dsFlexJwtStub = sinon.stub().resolves(
        {
          statusCode: 200,
          body: jwtResponse
        })
      connectorClientStub = sinon.stub().callsFake(() => {
        return {
          getWorldpay3dsFlexJwt: getWorldpay3dsFlexJwtStub
        }
      })
      service = requireService(connectorClientStub)
    })

    describe('payment provider is Worldpay, 3DS is enabled and integration version is 2', () => {
      it('should call connector to get a JWT', async () => {
        const charge = {
          id: 'a-charge-id',
          gatewayAccount: {
            paymentProvider: 'worldpay',
            requires3ds: true,
            integrationVersion3ds: 2
          }
        }
        const correlationId = 'a-correlation-id'
        const jwt = await service.getDdcJwt(charge, correlationId)

        expect(jwt).to.equal(TEST_JWT)
        expect(connectorClientStub.calledWith({ correlationId })).to.be.true // eslint-disable-line
        expect(getWorldpay3dsFlexJwtStub.calledWith({ chargeId: charge.id })).to.be.true // eslint-disable-line
      })
    })

    describe('payment provider is Worldpay, 3DS is enabled and integration version is 1', () => {
      it('should not call connector to get a JWT', async () => {
        const charge = {
          id: 'a-charge-id',
          gatewayAccount: {
            paymentProvider: 'worldpay',
            requires3ds: true,
            integrationVersion3ds: 1
          }
        }
        const jwt = await service.getDdcJwt(charge, 'a-correlation-id')

        expect(jwt).to.equal(null)
        expect(connectorClientStub.notCalled).to.be.true // eslint-disable-line
      })
    })

    describe('payment provider is Worldpay, 3DS is disabled', () => {
      it('should not call connector to get a JWT', async () => {
        const charge = {
          id: 'a-charge-id',
          gatewayAccount: {
            paymentProvider: 'worldpay',
            requires3ds: false,
            integrationVersion3ds: 2
          }
        }
        const jwt = await service.getDdcJwt(charge, 'a-correlation-id')

        expect(jwt).to.equal(null)
        expect(connectorClientStub.notCalled).to.be.true // eslint-disable-line
      })
    })

    describe('payment provider is not Worldpay', () => {
      it('should not call connector to get a JWT', async () => {
        const charge = {
          id: 'a-charge-id',
          gatewayAccount: {
            paymentProvider: 'epdq',
            requires3ds: true,
            integrationVersion3ds: 2
          }
        }
        const jwt = await service.getDdcJwt(charge, 'a-correlation-id')

        expect(jwt).to.equal(null)
        expect(connectorClientStub.notCalled).to.be.true // eslint-disable-line
      })
    })
  })

  describe('Get DDC JWT error', () => {
    beforeEach(() => {
      getWorldpay3dsFlexJwtStub = sinon.stub().resolves(
        {
          statusCode: 409
        })
      connectorClientStub = sinon.stub().callsFake(() => {
        return {
          getWorldpay3dsFlexJwt: getWorldpay3dsFlexJwtStub
        }
      })
      service = requireService(connectorClientStub)
    })

    describe('connector returns a non 200 response', () => {
      it('should throw an error', async () => {
        const charge = {
          id: 'a-charge-id',
          gatewayAccount: {
            paymentProvider: 'worldpay',
            requires3ds: true,
            integrationVersion3ds: 2
          }
        }
        const correlationId = 'a-correlation-id'
        await expect(service.getDdcJwt(charge, correlationId)).to.be.rejectedWith(Error)
      })
    })
  })
})
