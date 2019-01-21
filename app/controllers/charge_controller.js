'use strict'

// NPM dependencies
const logger = require('winston')
const _ = require('lodash')
const i18n = require('i18n')
const {getNamespace} = require('continuation-local-storage')
const AWSXRay = require('aws-xray-sdk')

// Local dependencies
const logging = require('../utils/logging')
const responseRouter = require('../utils/response_router')
const normalise = require('../services/normalise_charge')
const chargeValidator = require('../utils/charge_validation_backend')
const Charge = require('../models/charge')
const Card = require('../models/card')
const State = require('../../config/state')
const paths = require('../paths')
const {countries} = require('../services/countries')
const {commonTypos} = require('../utils/email_tools')
const {withAnalyticsError, withAnalytics} = require('../utils/analytics')
const connectorClient = require('../services/clients/connector_client')

// Constants
const clsXrayConfig = require('../../config/xray-cls')
const {views, preserveProperties} = require('../../config/charge_controller')
const {CORRELATION_HEADER} = require('../../config/correlation_header')

const appendChargeForNewView = (charge, req, chargeId) => {
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
  charge.allowWebPayments = charge.gatewayAccount.allowWebPayments
  charge.stubsUrl = process.env.APPLE_PAY_STUBS_URL
}

const routeFor = (resource, chargeId) => paths.generateRoute(`card.${resource}`, {chargeId: chargeId})

const redirect = res => {
  return {
    toAuth3dsRequired: (chargeId) => res.redirect(303, routeFor('auth3dsRequired', chargeId)),
    toAuthWaiting: (chargeId) => res.redirect(303, routeFor('authWaiting', chargeId)),
    toConfirm: (chargeId) => res.redirect(303, routeFor('confirm', chargeId)),
    toNew: (chargeId) => res.redirect(303, routeFor('new', chargeId)),
    toReturn: (chargeId) => res.redirect(303, routeFor('return', chargeId))
  }
}

const handleCreateResponse = (req, res, charge) => response => {
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
      responseRouter.response(req, res, 'SYSTEM_ERROR', withAnalytics(charge, {returnUrl: routeFor('return', charge.id)}))
      break
    default:
      redirect(res).toNew(req.chargeId)
  }
}

const handleAuthResponse = (req, res, charge) => response => {
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
        Charge(req.headers[CORRELATION_HEADER])
          .capture(req.chargeId)
          .then(
            () => redirect(res).toReturn(req.chargeId),
            err => {
              if (err.message === 'CAPTURE_FAILED') return responseRouter.response(req, res, 'CAPTURE_FAILURE', withAnalytics(charge))
              // else
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
      redirect(res).toNew(req.chargeId)
  }
}

module.exports = {
  new: (req, res) => {
    const charge = normalise.charge(req.chargeData, req.chargeId)
    appendChargeForNewView(charge, req, charge.id)
    charge.countries = countries
    if (charge.status === State.ENTERING_CARD_DETAILS) return responseRouter.response(req, res, views.CHARGE_VIEW, withAnalytics(charge, charge))
    // else
    Charge(req.headers[CORRELATION_HEADER]).updateToEnterDetails(charge.id).then(
      () => responseRouter.response(req, res, views.CHARGE_VIEW, withAnalytics(charge, charge)),
      () => responseRouter.response(req, res, 'NOT_FOUND', withAnalyticsError()))
  },
  create: (req, res) => {
    const namespace = getNamespace(clsXrayConfig.nameSpaceName)
    const clsSegment = namespace.get(clsXrayConfig.segmentKeyName)
    const charge = normalise.charge(req.chargeData, req.chargeId)
    const cardModel = Card(req.chargeData.gateway_account.card_types, req.headers[CORRELATION_HEADER])
    const chargeOptions = {
      email_collection_mode: charge.gatewayAccount.emailCollectionMode,
      collect_billing_address: res.locals.service.collectBillingAddress
    }
    const validator = chargeValidator(i18n.__('fieldErrors'), logger, cardModel, chargeOptions)
    let card

    normalise.addressLines(req.body)
    normalise.whitespace(req.body)

    if (charge.status === State.AUTH_READY) return redirect(res).toAuthWaiting(req.chargeId)
    // else
    AWSXRay.captureAsyncFunc('chargeValidator_verify', function (subSegment) {
      validator.verify(req)
        .catch(() => {
          subSegment.close('error')
          redirect(res).toNew(req.chargeId)
        })
        .then(data => {
          subSegment.close()
          card = data.card

          let emailTypos = false
          let emailPatch
          let userEmail

          if (
            charge.gatewayAccount.emailCollectionMode === 'OFF' ||
            (charge.gatewayAccount.emailCollectionMode === 'OPTIONAL' && (!req.body.email || req.body.email === ''))
          ) {
            emailPatch = Promise.resolve('Charge patch skipped as email collection mode was toggled off, or optional and not supplied')
          } else {
            userEmail = req.body.email
            emailPatch = Charge(req.headers[CORRELATION_HEADER]).patch(req.chargeId, 'replace', 'email', userEmail, subSegment)
            let emailChanged = false
            if (req.body.originalemail) {
              emailChanged = req.body.originalemail !== userEmail
            }
            emailTypos = commonTypos(userEmail)
            if (req.body['email-typo-sugestion']) {
              userEmail = emailChanged ? req.body.email : req.body['email-typo-sugestion']
              emailTypos = req.body['email-typo-sugestion'] !== req.body.originalemail ? commonTypos(userEmail) : null
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
            appendChargeForNewView(charge, req, charge.id)
            _.merge(data.validation, withAnalytics(charge, charge), _.pick(req.body, preserveProperties))
            return responseRouter.response(req, res, views.CHARGE_VIEW, data.validation)
          }
          AWSXRay.captureAsyncFunc('Charge_email_patch', function (subSegment) {
            emailPatch
              .then(() => {
                subSegment.close()
                const correlationId = req.headers[CORRELATION_HEADER] || ''
                const payload = normalise.apiPayload(req, card)
                if (res.locals.service.collectBillingAddress === false) {
                  delete payload.address
                }
                connectorClient({correlationId}).chargeAuth({chargeId: req.chargeId, payload})
                  .then(handleCreateResponse(req, res, charge))
              })
              .catch(err => {
                subSegment.close(err.message)
                logging.failedChargePatch(err.message)
                responseRouter.response(req, res, 'ERROR', withAnalyticsError())
              })
          }, clsSegment)
        })
    }, clsSegment)
  },
  createPaymentRequest: (req, res) => {
    const namespace = getNamespace(clsXrayConfig.nameSpaceName)
    const clsSegment = namespace.get(clsXrayConfig.segmentKeyName)
    const charge = normalise.charge(req.chargeData, req.chargeId)

    const convertedPayload = {
      body: {
        cardNo: req.body.details.cardNumber,
        cvc: req.body.details.cardSecurityCode,
        expiryMonth: req.body.details.expiryMonth,
        expiryYear: req.body.details.expiryYear,
        cardholderName: req.body.details.cardholderName,
        addressLine1: req.body.details.billingAddress.addressLine[0],
        addressLine2: req.body.details.billingAddress.addressLine[1] || '',
        addressCity: req.body.details.billingAddress.city,
        addressPostcode: req.body.details.billingAddress.postalCode,
        addressCountry: req.body.details.billingAddress.country
      }
    }

    if (charge.status === State.AUTH_READY) return redirect(res).toAuthWaiting(req.chargeId)

    AWSXRay.captureAsyncFunc('Charge_patch', function (subSegment) {
      Charge(req.headers[CORRELATION_HEADER]).patch(req.chargeId, 'replace', 'email', req.body.payerEmail, subSegment)
        .then(() => {
          subSegment.close()
          const correlationId = req.headers[CORRELATION_HEADER] || ''
          const payload = normalise.apiPayload(_.merge(req, convertedPayload), 'visa')
          connectorClient({correlationId})
            .chargeAuth({chargeId: req.chargeId, payload})
            .then(handleAuthResponse(req, res, charge))
        })
        .catch(err => {
          subSegment.close(err)
          logging.failedChargePatch(err)
          responseRouter.response(req, res, 'ERROR', withAnalyticsError())
        })
    }, clsSegment)
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
            return res.json({'accepted': false, message: error.message})
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
        redirect(res).toConfirm(req.chargeId)
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
    Charge(req.headers[CORRELATION_HEADER])
      .capture(req.chargeId)
      .then(
        () => redirect(res).toReturn(req.chargeId),
        err => {
          if (err.message === 'CAPTURE_FAILED') return responseRouter.response(req, res, 'CAPTURE_FAILURE', withAnalytics(charge))
          responseRouter.response(req, res, 'SYSTEM_ERROR', withAnalytics(
            charge,
            {returnUrl: routeFor('return', charge.id)}
          ))
        }
      )
  },
  captureWaiting: (req, res) => {
    const charge = normalise.charge(req.chargeData, req.chargeId)
    if (charge.status === State.CAPTURE_READY) {
      responseRouter.response(req, res, views.CAPTURE_WAITING_VIEW, withAnalytics(charge))
    } else {
      responseRouter.response(req, res, 'CAPTURE_SUBMITTED', withAnalytics(charge, {returnUrl: routeFor('return', charge.id)}))
    }
  },
  cancel: (req, res) => {
    const charge = normalise.charge(req.chargeData, req.chargeId)
    Charge(req.headers[CORRELATION_HEADER])
      .cancel(req.chargeId)
      .then(
        () => responseRouter.response(req, res, 'USER_CANCELLED', withAnalytics(charge, {returnUrl: routeFor('return', charge.id)})),
        () => responseRouter.response(req, res, 'SYSTEM_ERROR', withAnalytics(charge, {returnUrl: routeFor('return', charge.id)}))
      )
  }
}
