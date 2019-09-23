// NPM dependencies
const _ = require('lodash')
const logger = require('winston')

// Local dependencies
const logging = require('../utils/logging')
const responseRouter = require('../utils/response_router')
const normalise = require('../services/normalise_charge')
const paths = require('../paths')
const { withAnalytics } = require('../utils/analytics')
const connectorClient = require('../services/clients/connector_client')

// Constants
const { views, threeDsEPDQResults } = require('../../config/charge_controller')
const { CORRELATION_HEADER } = require('../../config/correlation_header')

const routeFor = (resource, chargeId) => paths.generateRoute(`card.${resource}`, { chargeId: chargeId })

const redirect = res => {
  return {
    toAuth3dsRequired: (chargeId) => res.redirect(303, routeFor('auth3dsRequired', chargeId)),
    toAuthWaiting: (chargeId) => res.redirect(303, routeFor('authWaiting', chargeId)),
    toConfirm: (chargeId) => res.redirect(303, routeFor('confirm', chargeId)),
    toNew: (chargeId) => res.redirect(303, routeFor('new', chargeId)),
    toReturn: (chargeId) => res.redirect(303, routeFor('return', chargeId))
  }
}

const build3dsPayload = req => {
  let auth3dsPayload = {}
  const paRes = _.get(req, 'body.PaRes')
  if (!_.isUndefined(paRes)) {
    auth3dsPayload.pa_response = paRes
  }

  const providerStatus = threeDsEPDQResults[_.get(req, 'body.providerStatus', '')]
  if (!_.isUndefined(providerStatus)) {
    auth3dsPayload.auth_3ds_result = providerStatus
  }

  const md = _.get(req, 'body.MD')
  if (!_.isUndefined(md)) {
    auth3dsPayload.md = md
  }

  return auth3dsPayload
}

const handleThreeDsResponse = (req, res, charge) => response => {
  switch (response.statusCode) {
    case 200:
    case 400:
      redirect(res).toConfirm(charge.id)
      break
    case 202:
    case 409:
      redirect(res).toAuthWaiting(charge.id)
      break
    case 500:
      logging.systemError('3DS response 500', req.headers && req.headers[CORRELATION_HEADER], charge.id)
      responseRouter.response(req, res, 'SYSTEM_ERROR', withAnalytics(charge))
      break
    default:
      logging.systemError('3DS unknown response (`ERROR` used)', req.headers && req.headers[CORRELATION_HEADER], charge.id)
      responseRouter.response(req, res, 'ERROR', withAnalytics(charge))
  }
}

module.exports = {
  auth3dsHandler (req, res) {
    const charge = normalise.charge(req.chargeData, req.chargeId)
    const correlationId = req.headers[CORRELATION_HEADER] || ''
    const payload = build3dsPayload(req)
    connectorClient({ correlationId }).threeDs({ chargeId: charge.id, payload })
      .then(handleThreeDsResponse(req, res, charge))
      .catch((err) => {
        logger.error('Exception in auth3dsHandler -', {
          chargeId: charge.id,
          chargeStatus: charge.status,
          error: err
        })
        responseRouter.response(req, res, 'ERROR', withAnalytics(charge))
      })
  },
  auth3dsRequired: (req, res) => {
    const charge = normalise.charge(req.chargeData, req.chargeId)
    responseRouter.response(req, res, views.AUTH_3DS_REQUIRED_VIEW, withAnalytics(charge))
  },
  auth3dsRequiredOut: (req, res) => {
    const charge = normalise.charge(req.chargeData, req.chargeId)
    const issuerUrl = _.get(charge, 'auth3dsData.issuerUrl')
    const paRequest = _.get(charge, 'auth3dsData.paRequest')
    const md = _.get(charge, 'auth3dsData.md')
    const htmlOut = _.get(charge, 'auth3dsData.htmlOut')
    const worldpayChallengeJwt = _.get(charge, 'auth3dsData.worldpayChallengeJwt')

    if (issuerUrl && paRequest) {
      let data = {
        issuerUrl: issuerUrl,
        paRequest: paRequest,
        threeDSReturnUrl: `${req.protocol}://${req.hostname}${paths.generateRoute('external.card.auth3dsRequiredIn', { chargeId: charge.id })}`
      }
      if (md) {
        data.md = md
      }
      responseRouter.response(req, res, views.AUTH_3DS_REQUIRED_OUT_VIEW, data)
    } else if (worldpayChallengeJwt) {
      const challengeUrl = charge.gatewayAccount.type === 'live'
        ? process.env.WORLDPAY_3DS_FLEX_CHALLENGE_LIVE_URL
        : process.env.WORLDPAY_3DS_FLEX_CHALLENGE_TEST_URL
      let data = {
        issuerUrl: challengeUrl,
        worldpayChallengeJwt: worldpayChallengeJwt
      }
      responseRouter.response(req, res, views.AUTH_3DS_REQUIRED_OUT_VIEW, data)
    } else if (htmlOut) {
      responseRouter.response(req, res, views.AUTH_3DS_REQUIRED_HTML_OUT_VIEW, {
        htmlOut: Buffer.from(htmlOut, 'base64').toString('utf8')
      })
    } else if (issuerUrl) {
      res.redirect(303, issuerUrl)
    } else {
      responseRouter.response(req, res, 'ERROR', withAnalytics(charge))
    }
  },
  auth3dsRequiredIn: (req, res) => {
    const charge = normalise.charge(req.chargeData, req.chargeId)
    responseRouter.response(req, res, views.AUTH_3DS_REQUIRED_IN_VIEW, {
      threeDsHandlerUrl: routeFor('auth3dsHandler', charge.id),
      paResponse: _.get(req, 'body.PaRes'),
      md: _.get(req, 'body.MD')
    })
  },
  auth3dsRequiredInEpdq: (req, res) => {
    const charge = normalise.charge(req.chargeData, req.chargeId)
    responseRouter.response(req, res, views.AUTH_3DS_REQUIRED_IN_VIEW, {
      threeDsHandlerUrl: routeFor('auth3dsHandler', charge.id),
      providerStatus: _.get(req, 'query.status', 'success')
    })
  }
}
