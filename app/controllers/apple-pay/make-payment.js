'use strict'

// NPM dependencies
const logger = require('winston')
const AWSXRay = require('aws-xray-sdk')
const {getNamespace} = require('continuation-local-storage')

const connectorClient = require('../../services/clients/connector_client')
const normaliseApplePayPayload = require('./normalise-apple-pay-payload')
const responseRouter = require('../../utils/response_router')
const CORRELATION_HEADER = require('../../utils/correlation_header').CORRELATION_HEADER
const withAnalyticsError = require('../../utils/analytics').withAnalyticsError

// constants
const clsXrayConfig = require('../../../config/xray-cls')

module.exports = (req, res) => {
  // should be req.body
  const body = {
    shippingContact:
      {
        emailAddress: 'jonheslop@shoubemeail.test',
        familyName: '',
        givenName: '',
        phoneticFamilyName: '',
        phoneticGivenName: ''
      },
    token: {
      paymentData:
        {
          version: 'EC_v1',
          data: 'MLHhOn2BXhNw9wLLDR48DyeUcuSmRJ6KnAIGTMGqsgiMpc+AoJ…LUQ6UovkfSnW0sFH6NGZ0jhoap6LYnThYb9WT6yKfEm/rDhM=',
          signature: 'MIAGCSqGSIb3DQEHAqCAMIACAQExDzANBglghkgBZQMEAgEFAD…ZuQFfsLJ+Nb3+7bpjfBsZAhA1sIT1XmHoGFdoCUT3AAAAAAAA',
          header: {
            ephemeralPublicKey: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE5/Qc6z4TY5HQ5n…KC3kJ4DtIWedPQ70N35PBZzJUrFjtvDZFUvs80uo2ynu+lw==',
            publicKeyHash: 'Xzn7W3vsrlKlb0QvUAviASubdtW4BotWrDo5mGG+UWY=',
            transactionId: '372c3858122b6bc39c6095eca2f994a8aa012f3b025d0d72ecfd449c2a5877f9'
          }
        },
      paymentMethod:
        {
          displayName: 'MasterCard 1358',
          network: 'MasterCard',
          type: 'debit'
        },
      transactionIdentifier: '372C3858122B6BC39C6095ECA2F994A8AA012F3B025D0D72ECFD449C2A5877F9'
    }
  }
  const payload = normaliseApplePayPayload(body)
  const namespace = getNamespace(clsXrayConfig.nameSpaceName)
  const clsSegment = namespace.get(clsXrayConfig.segmentKeyName)
  AWSXRay.captureAsyncFunc('Auth_charge_wallet', (subsegment) => {
    connectorClient({correlationId: req.headers[CORRELATION_HEADER]}).chargeAuthWithWallet({chargeId: req.chargeId, payload: JSON.stringify(payload)})
      .then(data => {
        subsegment.close()
        console.log('RECEIVED FROM CONNECTOR: ', data)
        res.status(200).send(data)
      })
      .catch(() => {
        subsegment.close('error')
        responseRouter.response(req, res, 'SYSTEM_ERROR', withAnalyticsError())
      })
  }, clsSegment)
}
