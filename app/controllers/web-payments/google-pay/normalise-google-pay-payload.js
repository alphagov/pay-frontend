'use strict'

const logger = require('../../../utils/logger')(__filename)
const { getLoggingFields } = require('../../../utils/logging-fields-helper')
const { output, redact } = require('../../../utils/structured-logging-value-helper')
const userIpAddress = require('../../../utils/user-ip-address')
const humps = require('humps')
const lodash = require('lodash')

const logSelectedPayloadProperties = req => {
  const payload = req.body

  const selectedPayloadProperties = lodash.pick(payload, [
    'worldpay3dsFlexDdcResult',
    'paymentResponse.payerName',
    'paymentResponse.payerEmail',
    'paymentResponse.details.paymentMethodData.info.cardDetails',
    'paymentResponse.details.paymentMethodData.info.cardNetwork'
  ])

  if (lodash.has(payload, 'worldpay3dsFlexDdcResult')) {
    selectedPayloadProperties.worldpay3dsFlexDdcResult = redact(payload.worldpay3dsFlexDdcResult)
  }
  if (lodash.has(payload, 'paymentResponse.payerName')) {
    selectedPayloadProperties.paymentResponse.payerName = redact(payload.paymentResponse.payerName)
  }
  if (lodash.has(payload, 'paymentResponse.payerEmail')) {
    selectedPayloadProperties.paymentResponse.payerEmail = redact(payload.paymentResponse.payerEmail)
  }
  if (lodash.has(payload, 'paymentResponse.details.paymentMethodData.info.cardDetails')) {
    selectedPayloadProperties.paymentResponse.details.paymentMethodData.info.cardDetails = output(payload.paymentResponse.details.paymentMethodData.info.cardDetails)
  }
  if (lodash.has(payload, 'paymentResponse.details.paymentMethodData.info.cardNetwork')) {
    selectedPayloadProperties.paymentResponse.details.paymentMethodData.info.cardNetwork = output(payload.paymentResponse.details.paymentMethodData.info.cardNetwork)
  }

  logger.info('Received Google Pay payload', {
    ...getLoggingFields(req),
    selected_payload_properties: selectedPayloadProperties
  })
}

const normaliseCardName = cardName => {
  if (!cardName) {
    throw new Error('Card brand is not available in Google Pay payload')
  }

  switch (cardName) {
    case 'MASTERCARD':
      return 'master-card'
    case 'AMEX':
      return 'american-express'
    case 'VISA':
    case 'ELECTRON':
      return 'visa'
    case 'DISCOVER':
      return 'discover'
    case 'JCB':
      return 'jcb'
    default:
      throw new Error('Unrecognised card brand in Google Pay payload: ' + cardName)
  }
}

const normaliseLastDigitsCardNumber = cardDetails => {
  let lastDigitsCardNumber = ''

  if (cardDetails.match(/^[0-9]{4}$/)) {
    lastDigitsCardNumber = cardDetails
  }

  return lastDigitsCardNumber
}

const nullable = word => {
  if (word.length === 0 || !word.trim()) {
    return null
  }
  return word
}

module.exports = req => {
  logSelectedPayloadProperties(req)

  const payload = req.body

  const paymentInfo = {
    last_digits_card_number: normaliseLastDigitsCardNumber(lodash.get(payload, 'paymentResponse.details.paymentMethodData.info.cardDetails', '')),
    brand: normaliseCardName(lodash.get(payload, 'paymentResponse.details.paymentMethodData.info.cardNetwork', '')),
    cardholder_name: nullable(payload.paymentResponse.payerName || ''),
    email: nullable(payload.paymentResponse.payerEmail || ''),
    worldpay_3ds_flex_ddc_result: nullable(payload.worldpay3dsFlexDdcResult || ''),
    accept_header: req.headers['accept-for-html'],
    user_agent_header: req.headers['user-agent'],
    ip_address: userIpAddress(req)
  }

  const paymentData = humps.decamelizeKeys(JSON.parse(payload.paymentResponse.details.paymentMethodData.tokenizationData.token))
  delete payload.paymentResponse.details.paymentMethodData

  return {
    payment_info: paymentInfo,
    encrypted_payment_data: paymentData
  }
}
