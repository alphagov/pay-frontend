// NPM dependencies
const _ = require('lodash')

// Local dependencies
const logger = require('../utils/logger')(__filename)
const { getLoggingFields } = require('../utils/logging_fields_helper')
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

const build3dsPayload = (chargeId, req) => {
  const auth3dsPayload = {}
  const paRes = _.get(req, 'body.PaRes')
  if (!_.isUndefined(paRes)) {
    auth3dsPayload.pa_response = paRes

    const paResSegments = []
    for (let i = 0; i < paRes.length; i += 1000) {
      paResSegments.push(paRes.substring(i, i + 1000))
    }
    for (let i = 0; i < paResSegments.length; i++) {
      logger.info(`paRes received for charge [${chargeId}] 3DS authorisation [${paResSegments[i]}] (${i + 1}/${paResSegments.length})`,
        getLoggingFields(req))
    }
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
      if (_.get(response, 'body.status', '') === 'AUTHORISATION 3DS REQUIRED') {
        logger.info('3DS required again', getLoggingFields(req))
        redirect(res).toAuth3dsRequired(charge.id)
      } else {
        redirect(res).toConfirm(charge.id)
      }
      break
    case 202:
    case 409:
      redirect(res).toAuthWaiting(charge.id)
      break
    case 500:
      responseRouter.systemErrorResponse(req, res, '3DS response 500', withAnalytics(charge))
      break
    default:
      responseRouter.errorResponse(req, res, '3DS unknown response', withAnalytics(charge))
  }
}

module.exports = {
  auth3dsHandler (req, res) {
    const charge = normalise.charge(req.chargeData, req.chargeId)
    const correlationId = req.headers[CORRELATION_HEADER] || ''
    const payload = build3dsPayload(charge.id, req)
    connectorClient({ correlationId }).threeDs({ chargeId: charge.id, payload }, getLoggingFields(req))
      .then(handleThreeDsResponse(req, res, charge))
      .catch((err) => {
        logger.error('Exception in auth3dsHandler', {
          ...getLoggingFields(req),
          charge_status: charge.status,
          error: err
        })
        responseRouter.errorResponse(req, res, 'Exception in auth3dsHandler', withAnalytics(charge), err)
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
    const threeDSReturnUrl = `${req.protocol}://${req.hostname}${paths.generateRoute('external.card.auth3dsRequiredIn', { chargeId: charge.id })}`

    if (issuerUrl && paRequest) {
      const data = {
        postUrl: issuerUrl,
        paRequest: paRequest,
        threeDSReturnUrl: threeDSReturnUrl
      }
      if (md) {
        data.md = md
      }

      logger.info('Rendering form to post to card issuer to initiate 3DS authentication', {
        ...getLoggingFields(req),
        form: {
          action: issuerUrl,
          fields: {
            PaReq: paRequest,
            MD: md,
            TermUrl: threeDSReturnUrl
          }
        }
      })

      responseRouter.response(req, res, views.AUTH_3DS_REQUIRED_OUT_VIEW, data)
    } else if (worldpayChallengeJwt) {
      const challengeUrl = charge.gatewayAccount.type === 'live'
        ? process.env.WORLDPAY_3DS_FLEX_CHALLENGE_LIVE_URL
        : process.env.WORLDPAY_3DS_FLEX_CHALLENGE_TEST_URL
      const data = {
        postUrl: challengeUrl,
        worldpayChallengeJwt: worldpayChallengeJwt
      }

      logger.info('Rendering form to post to Worldpay to initiate 3DS authentication', {
        ...getLoggingFields(req),
        form: {
          action: challengeUrl,
          fields: {
            PaReq: paRequest,
            MD: md,
            JWT: worldpayChallengeJwt
          }
        }
      })

      responseRouter.response(req, res, views.AUTH_3DS_REQUIRED_OUT_VIEW, data)
    } else if (htmlOut) {
      responseRouter.response(req, res, views.AUTH_3DS_REQUIRED_HTML_OUT_VIEW, {
        htmlOut: Buffer.from(htmlOut, 'base64').toString('utf8')
      })
    } else if (issuerUrl) {
      res.redirect(303, issuerUrl)
    } else {
      responseRouter.errorResponse(req, res, 'auth3dsData missing for charge - unable to start 3DS', withAnalytics(charge))
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
