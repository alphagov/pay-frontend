'use strict'

const proxyquire = require('proxyquire')
const sinon = require('sinon')
const { expect } = require('chai')

const { validDdcJwt } = require('../fixtures/worldpay_3ds_flex_fixtures')

const TEST_JWT = 'a-jwt-returned-from-connector'

const requireService = function (mockedConnectorClient) {
  return proxyquire('../../app/services/worldpay_3ds_flex_service', {
    './clients/connector_client': mockedConnectorClient
  })
}

describe('Worldpay 3DS Flex service', () => {
  let service
  let connectorClientStub
  let getWorldpay3dsFlexJwtStub

  beforeEach(() => {
    const jwtResponse = validDdcJwt(TEST_JWT).getPlain()
    getWorldpay3dsFlexJwtStub = sinon.stub().resolves({ body: jwtResponse })
    connectorClientStub = sinon.stub().callsFake(() => {
      return {
        getWorldpay3dsFlexJwt: getWorldpay3dsFlexJwtStub
      }
    })
    service = requireService(connectorClientStub)
  })

  describe('get DDC JWT', () => {
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
})
