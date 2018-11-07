'use strict'

// NPM dependencies
const logger = require('winston')
const AWSXRay = require('aws-xray-sdk')
const {getNamespace} = require('continuation-local-storage')

const normalise = require('../../services/normalise_charge')
const logging = require('../../utils/logging')
const connectorClient = require('../../services/clients/connector_client')
const normaliseApplePayPayload = require('./normalise-apple-pay-payload')
const responseRouter = require('../../utils/response_router')
const CORRELATION_HEADER = require('../../../config/correlation_header').CORRELATION_HEADER
const Charge = require('../../models/charge')
const {withAnalyticsError, withAnalytics} = require('../../utils/analytics')
const paths = require('../../paths')

// constants
const clsXrayConfig = require('../../../config/xray-cls')
const routeFor = (resource, chargeId) => paths.generateRoute(`card.${resource}`, {chargeId: chargeId})

const handleAuthResponse = (req, res, charge) => response => {
  switch (response.statusCode) {
    case 202:
    case 409:
      logging.failedChargePost(409)
      return routeFor('authWaiting', req.chargeId)
    case 200:
      console.log('response status >>>> ', response.body.status)
      if (response.body.status !== 'AUTHORISATION SUCCESS') {
        res.status(200).send({
          url: routeFor('confirm', req.chargeId)
        })
      } else {
        console.log('capturing charge ')
        Charge(req.headers[CORRELATION_HEADER])
          .capture(req.chargeId)
          .then(
            () => {
              console.log('bla')
              res.status(200).send({
                url: routeFor('return', req.chargeId)
              })
            },
            err => {
              if (err.message === 'CAPTURE_FAILED') return responseRouter.response(req, res, 'CAPTURE_FAILURE', withAnalytics(charge))
              responseRouter.response(req, res, 'SYSTEM_ERROR', withAnalytics(
                charge,
                {returnUrl: routeFor('return', charge.id)}
              ))
            }
          )
      }
      break
    case 500:
      logging.failedChargePost(409)
      responseRouter.response(req, res, 'SYSTEM_ERROR', withAnalytics(charge, {returnUrl: routeFor('return', charge.id)}))
      break
    default:
      return routeFor('new', req.chargeId)
  }
}

module.exports = (req, res) => {
  let body = req.body
  if (process.env.APPLE_PAY_STUBS_URL) {
    logger.info('sending a stub apple pay response to connector')
    body = {
      'shippingContact':
        {
          'emailAddress': 'jonheslop@shoubemeail.test',
          'familyName': 'mr',
          'givenName': 'pausad',
          'phoneticFamilyName': '',
          'phoneticGivenName': ''
        },
      'token': {
        'paymentData':
          {
            'version': 'EC_v1',
            'data': 'MLHhOn2BXhNw9wLLDR48DyeUcuSmRJ6KnAIGTMGqsgiMpc+AoLUQ6UovkfSnW0sFH6NGZ0jhoap6LYnThYb9WT6yKfEm/rDhM=',
            'signature': 'MIAGCSqGSIb3DQEHAqCAMIACAQExDzANBglghkgBZQMEAgEFADZuQFfsLJ+Nb3+7bpjfBsZAhA1sIT1XmHoGFdoCUT3AAAAAAAA',
            'header': {
              'ephemeralPublicKey': 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE5/Qc6z4TY5HQ5n…KC3kJ4DtIWedPQ70N35PBZzJUrFjtvDZFUvs80uo2ynu+lw==',
              'publicKeyHash': 'Xzn7W3vsrlKlb0QvUAviASubdtW4BotWrDo5mGG+UWY=',
              'transactionId': '372c3858122b6bc39c6095eca2f994a8aa012f3b025d0d72ecfd449c2a5877f9',
              'applicationData': '372c3858122b6bc39c6095eca2f994a8aa012f3b025d0d72ecfd449c2a5877f9',
              'wrappedKey': '372c3858122b6bc39c6095eca2f994a8aa012f3b025d0d72ecfd449c2a5877f9'
            }
          },
        'paymentMethod':
          {
            'displayName': 'MasterCard 4242',
            'network': 'MasterCard',
            'type': 'debit'
          },
        'transactionIdentifier': '372C3858122B6BC39C6095ECA2F994A8AA012F3B025D0D72ECFD449C2A5877F9'
      }
    }
  }
  const payload = normaliseApplePayPayload(body)
  const namespace = getNamespace(clsXrayConfig.nameSpaceName)
  const clsSegment = namespace.get(clsXrayConfig.segmentKeyName)
  const charge = normalise.charge(req.chargeData, req.chargeId)
  return AWSXRay.captureAsyncFunc('Auth_charge_wallet', (subsegment) => {
    return connectorClient({correlationId: req.headers[CORRELATION_HEADER]}).chargeAuthWithWallet({chargeId: req.chargeId, payload: payload})
      .then(data => {
        subsegment.close()
        return handleAuthResponse(req, res, charge)(data)
      })
      .catch(() => {
        subsegment.close('error')
        return responseRouter.response(req, res, 'SYSTEM_ERROR', withAnalyticsError())
      })
  }, clsSegment)
}
