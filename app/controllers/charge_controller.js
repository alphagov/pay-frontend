'use strict'

// NPM dependencies
const _ = require('lodash')
const i18n = require('i18n')
const { getNamespace } = require('continuation-local-storage')
const AWSXRay = require('aws-xray-sdk')

// Local dependencies
const {
  GOOGLE_PAY_MERCHANT_ID,
  WORLDPAY_3DS_FLEX_DDC_TEST_URL,
  WORLDPAY_3DS_FLEX_DDC_LIVE_URL
} = process.env
const logger = require('../utils/logger')(__filename)
const logging = require('../utils/logging')
const responseRouter = require('../utils/response_router')
const normalise = require('../services/normalise_charge')
const chargeValidator = require('../utils/charge_validation_backend')
const Charge = require('../models/charge')
const Card = require('../models/card')
const State = require('../../config/state')
const paths = require('../paths')
const { countries } = require('../services/countries')
const { commonTypos } = require('../utils/email_tools')
const { withAnalyticsError, withAnalytics } = require('../utils/analytics')
const connectorClient = require('../services/clients/connector_client')
const cookies = require('../utils/cookies')
const { getGooglePayMethodData, googlePayDetails } = require('../utils/google-pay-check-request')
const supportedNetworksFormattedByProvider = require('../assets/javascripts/browsered/web-payments/format-card-types')
const worlpay3dsFlexService = require('../services/worldpay_3ds_flex_service')

// Constants
const clsXrayConfig = require('../../config/xray-cls')
const { views, preserveProperties } = require('../../config/charge_controller')
const { CORRELATION_HEADER } = require('../../config/correlation_header')
const { createChargeIdSessionKey } = require('../utils/session')

const appendChargeForNewView = async function appendChargeForNewView (charge, req, chargeId) {
  const cardModel = Card(charge.gatewayAccount.cardTypes, req.headers[CORRELATION_HEADER])
  charge.withdrawalText = cardModel.withdrawalTypes.join('_')
  charge.allowedCards = cardModel.allowed
  charge.cardsAsStrings = JSON.stringify(cardModel.allowed)
  charge.corporateCardSurchargeAmountsAsStrings = JSON.stringify({
    credit: charge.gatewayAccount.corporateCreditCardSurchargeAmount,
    debit: charge.gatewayAccount.corporateDebitCardSurchargeAmount,
    prepaidCredit: charge.gatewayAccount.corporatePrepaidCreditCardSurchargeAmount,
    prepaidDebit: charge.gatewayAccount.corporatePrepaidDebitCardSurchargeAmount
  })
  charge.post_card_action = routeFor('create', chargeId)
  charge.id = chargeId
  charge.post_cancel_action = routeFor('cancel', chargeId)
  charge.allowApplePay = charge.gatewayAccount.allowApplePay
  charge.allowGooglePay = charge.gatewayAccount.allowGooglePay
  charge.googlePayGatewayMerchantID = charge.gatewayAccount.gatewayMerchantId
  charge.googlePayRequestMethodData = getGooglePayMethodData({
    allowedCardTypes: supportedNetworksFormattedByProvider(cardModel.allowed, 'google'),
    merchantId: GOOGLE_PAY_MERCHANT_ID,
    gatewayMerchantId: charge.gatewayAccount.gatewayMerchantId
  })
  charge.googlePayRequestDetails = googlePayDetails

  const correlationId = req.headers[CORRELATION_HEADER] || ''
  charge.worldpay3dsFlexDdcJwt = await worlpay3dsFlexService.getDdcJwt(charge, correlationId)
  charge.worldpay3dsFlexDdcUrl = charge.gatewayAccount.type !== 'live' ? WORLDPAY_3DS_FLEX_DDC_TEST_URL : WORLDPAY_3DS_FLEX_DDC_LIVE_URL
}

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

const handleCreateResponse = (req, res, charge, response) => {
  switch (response.statusCode) {
    case 202:
    case 409:
      logging.failedChargePost(409)
      redirect(res).toAuthWaiting(req.chargeId)
      break
    case 200:
      if (_.get(response.body, 'status') === State.AUTH_3DS_REQUIRED) {
        redirect(res).toAuth3dsRequired(req.chargeId)
      } else {
        redirect(res).toConfirm(req.chargeId)
      }
      break
    case 500:
      logging.failedChargePost(409)
      logging.systemError('Charge create response', req.headers && req.headers[CORRELATION_HEADER], charge.id)
      responseRouter.response(req, res, 'SYSTEM_ERROR', withAnalytics(charge, { returnUrl: routeFor('return', charge.id) }))
      break
    default:
      redirect(res).toNew(req.chargeId)
  }
}

module.exports = {
  new: (req, res) => {
    const charge = normalise.charge(req.chargeData, req.chargeId)
    return appendChargeForNewView(charge, req, charge.id).then(
      () => {
        charge.countries = countries
        if (charge.status === State.ENTERING_CARD_DETAILS) return responseRouter.response(req, res, views.CHARGE_VIEW, withAnalytics(charge, charge))
        // else
        Charge(req.headers[CORRELATION_HEADER]).updateToEnterDetails(charge.id).then(
          () => responseRouter.response(req, res, views.CHARGE_VIEW, withAnalytics(charge, charge)),
          () => responseRouter.response(req, res, 'NOT_FOUND', withAnalyticsError()))
      },
      err => {
        logging.failedGetWorldpayDdcJwt(err)
        responseRouter.response(req, res, 'SYSTEM_ERROR', withAnalytics(charge))
      })
  },
  create: async (req, res) => {
    const charge = normalise.charge(req.chargeData, req.chargeId)
    const cardModel = Card(req.chargeData.gateway_account.card_types, req.headers[CORRELATION_HEADER])
    const chargeOptions = {
      email_collection_mode: charge.gatewayAccount.emailCollectionMode,
      collect_billing_address: res.locals.service.collectBillingAddress
    }
    const validator = chargeValidator(i18n.__('fieldErrors'), logger, cardModel, chargeOptions)

    normalise.addressLines(req.body)
    normalise.whitespace(req.body)

    if (charge.status === State.AUTH_READY) return redirect(res).toAuthWaiting(req.chargeId)
    // else
    let data
    try {
      data = await validator.verify(req)
    } catch (err) {
      return redirect(res).toNew(req.chargeId)
    }
    const card = data.card

    let emailTypos = false
    let userEmail

    if (charge.gatewayAccount.emailCollectionMode === 'MANDATORY' ||
      (charge.gatewayAccount.emailCollectionMode === 'OPTIONAL' && req.body.email)
    ) {
      userEmail = req.body.email
      let emailChanged = false
      if (req.body.originalemail) {
        emailChanged = req.body.originalemail !== userEmail
      }
      emailTypos = commonTypos(userEmail)
      if (req.body['email-typo-sugestion']) {
        userEmail = emailChanged ? req.body.email : req.body['email-typo-sugestion']
        emailTypos = req.body['email-typo-sugestion'] !== req.body.originalemail ? commonTypos(userEmail) : null
      }
      try {
        await Charge(req.headers[CORRELATION_HEADER]).patch(req.chargeId, 'replace', 'email', userEmail)
      } catch (err) {
        return responseRouter.response(req, res, 'SYSTEM_ERROR', withAnalytics(charge))
      }
    }

    if (data.validation.hasError || emailTypos) {
      if (emailTypos) {
        data.validation.hasError = true
        data.validation.errorFields.push({
          cssKey: 'email-typo',
          value: i18n.__('fieldErrors.fields.email.typo')
        })
        data.validation.typos = emailTypos
        data.validation.originalEmail = userEmail
      }
      charge.countries = countries
      try {
        await appendChargeForNewView(charge, req, charge.id)
      } catch (err) {
        logging.failedGetWorldpayDdcJwt(err)
        return responseRouter.response(req, res, 'SYSTEM_ERROR', withAnalytics(charge))
      }
      _.merge(data.validation, withAnalytics(charge, charge), _.pick(req.body, preserveProperties))
      return responseRouter.response(req, res, views.CHARGE_VIEW, data.validation)
    }

    const correlationId = req.headers[CORRELATION_HEADER] || ''
    const payload = normalise.apiPayload(req, card)
    if (res.locals.service.collectBillingAddress === false) {
      delete payload.address
    }
    try {
      const response = await connectorClient({ correlationId }).chargeAuth({ chargeId: req.chargeId, payload })
      handleCreateResponse(req, res, charge, response)
    } catch (err) {
      logging.failedChargePatch(err.message)
      responseRouter.response(req, res, 'ERROR', withAnalyticsError())
    }
  },
  checkCard: (req, res) => {
    const namespace = getNamespace(clsXrayConfig.nameSpaceName)
    const clsSegment = namespace.get(clsXrayConfig.segmentKeyName)
    AWSXRay.captureAsyncFunc('Card_checkCard', function (subSegment) {
      Card(req.chargeData.gateway_account.card_types, req.headers[CORRELATION_HEADER])
        .checkCard(normalise.creditCard(req.body.cardNo), req.chargeData.language, subSegment)
        .then(
          card => {
            subSegment.close()
            return res.json({
              accepted: true,
              type: card.type,
              corporate: card.corporate,
              prepaid: card.prepaid
            })
          },
          error => {
            subSegment.close(error.message)
            return res.json({ 'accepted': false, message: error.message })
          }
        )
    }, clsSegment)
  },
  authWaiting: (req, res) => {
    const charge = normalise.charge(req.chargeData, req.chargeId)
    switch (charge.status) {
      case (State.AUTH_READY):
      case (State.AUTH_3DS_READY):
        responseRouter.response(req, res, views.AUTH_WAITING_VIEW, withAnalytics(charge))
        break
      case (State.AUTH_3DS_REQUIRED):
        redirect(res).toAuth3dsRequired(req.chargeId)
        break
      default:
        if (charge.walletType !== undefined) {
          Charge(req.headers[CORRELATION_HEADER])
            .capture(req.chargeId)
            .then(
              () => redirect(res).toReturn(req.chargeId),
              err => {
                if (err.message === 'CAPTURE_FAILED') return responseRouter.response(req, res, 'CAPTURE_FAILURE', withAnalytics(charge))
                logging.systemError('Capturing charge for wallet payment', req.headers && req.headers[CORRELATION_HEADER], charge.id)
                responseRouter.response(req, res, 'SYSTEM_ERROR', withAnalytics(
                  charge,
                  { returnUrl: routeFor('return', charge.id) }
                ))
              }
            )
        } else {
          redirect(res).toConfirm(req.chargeId)
        }
    }
  },
  confirm: (req, res) => {
    const charge = normalise.charge(req.chargeData, req.chargeId)
    const confirmPath = routeFor('confirm', charge.id)
    responseRouter.response(req, res, views.CONFIRM_VIEW, withAnalytics(charge, {
      hitPage: routeFor('new', charge.id) + '/success',
      charge: charge,
      confirmPath: confirmPath,
      post_cancel_action: routeFor('cancel', charge.id)
    }, confirmPath))
  },
  capture: (req, res) => {
    const charge = normalise.charge(req.chargeData, req.chargeId)
    const cookieKey = createChargeIdSessionKey(req.chargeId)
    Charge(req.headers[CORRELATION_HEADER])
      .capture(req.chargeId)
      .then(() => redirect(res).toReturn(req.chargeId),
        (err) => {
          cookies.deleteSessionVariable(req, cookieKey)
          if (err.message === 'CAPTURE_FAILED') return responseRouter.response(req, res, 'CAPTURE_FAILURE', withAnalytics(charge))
          logging.systemError('Capturing charge', req.headers && req.headers[CORRELATION_HEADER], charge.id)
          responseRouter.response(req, res, 'SYSTEM_ERROR', withAnalytics(
            charge,
            { returnUrl: routeFor('return', charge.id) }
          ))
        }
      )
  },
  captureWaiting: (req, res) => {
    const charge = normalise.charge(req.chargeData, req.chargeId)
    if (charge.status === State.CAPTURE_READY) {
      responseRouter.response(req, res, views.CAPTURE_WAITING_VIEW, withAnalytics(charge))
    } else {
      responseRouter.response(req, res, 'CAPTURE_SUBMITTED', withAnalytics(charge, { returnUrl: routeFor('return', charge.id) }))
    }
  },
  cancel: (req, res) => {
    const charge = normalise.charge(req.chargeData, req.chargeId)
    // @FIXME(sfount) use `catch` syntax in favour of passing multiple callbacks
    //                to `then`--
    //                Charge.cancel().then('USER_CANCELLED').catch('SYSTEM_ERROR')
    Charge(req.headers[CORRELATION_HEADER])
      .cancel(req.chargeId)
      .then(
        () => responseRouter.response(req, res, 'USER_CANCELLED', withAnalytics(charge, { returnUrl: routeFor('return', charge.id) })),
        () => {
          logging.systemError('Cancelling charge', req.headers && req.headers[CORRELATION_HEADER], charge.id)
          responseRouter.response(req, res, 'SYSTEM_ERROR', withAnalytics(charge, { returnUrl: routeFor('return', charge.id) }))
        }
      )
  }
}
