const countries = require('../services/countries')
const humps = require('humps')
const normaliseCards = require('../services/normalise_cards.js')
const _ = require('lodash')

module.exports = {
  charge: charge,
  addressForApi: addressForApi,
  addressLines: addressLines,
  whitespace: whitespace,
  addressForView: addressForView,
  creditCard: creditCard,
  expiryDate: expiryDate,
  apiPayload: apiPayload,
  authUrl: authUrl,
  chargeUrl: chargeUrl
}

function charge (charge, chargeId) {
  var chargeObj = {
    id: chargeId,
    amount: penceToPounds(charge.amount),
    service_return_url: charge.return_url,
    description: charge.description,
    links: charge.links,
    status: charge.status,
    email: charge.email,
    gatewayAccount: normaliseGatewayAccountDetails(charge.gateway_account)
  }
  if (charge.auth_3ds_data) {
    chargeObj.auth3dsData = normaliseAuth3dsData(charge.auth_3ds_data)
  }
  if (charge.card_details) {
    chargeObj.cardDetails = normaliseConfirmationDetails(charge.card_details)
  }
  return chargeObj
}

function penceToPounds (pence) {
  return (parseInt(pence) / 100).toFixed(2)
}

function addressForApi (body) {
  return {
    line1: body.addressLine1,
    line2: body.addressLine2,
    city: body.addressCity,
    postcode: body.addressPostcode,
    country: body.addressCountry
  }
}

// body is passed by reference
function addressLines (body) {
  if (!body.addressLine1 && body.addressLine2) {
    body.addressLine1 = body.addressLine2
    delete body.addressLine2
  }
}

function whitespace (body) {
  const toIgnore = [
    'submitCardDetails',
    'csrfToken',
    'chargeId'
  ]

  _.forIn(body, function (value, key) {
    if (!_.includes(toIgnore, key)) {
      body[key] = value.trim()
    }
  })
}

function normaliseConfirmationDetails (cardDetails) {
  cardDetails.cardNumber = '************' + cardDetails.last_digits_card_number
  delete cardDetails.last_digits_card_number
  let normalisedDetails = humps.camelizeKeys(cardDetails)
  normalisedDetails.billingAddress = normaliseAddress(cardDetails.billing_address)
  return normalisedDetails
}

function normaliseAddress (address) {
  return [address.line1,
    address.line2,
    address.city,
    address.postcode,
    countries.translateAlpha2(address.country)].filter(function (str) { return str }).join(', ')
}

function normaliseGatewayAccountDetails (accountDetails) {
  let gatewayAccountDetails = humps.camelizeKeys(accountDetails)
  gatewayAccountDetails.cardTypes = normaliseCards(gatewayAccountDetails.cardTypes)
  return gatewayAccountDetails
}

function normaliseAuth3dsData (auth3dsData) {
  return {
    paRequest: auth3dsData.paRequest,
    issuerUrl: auth3dsData.issuerUrl
  }
}

// an empty string is equal to false in soft equality used by filter
function addressForView (body) {
  return [body.addressLine1,
    body.addressLine2,
    body.addressCity,
    body.addressPostcode,
    countries.translateAlpha2(body.addressCountry)].filter(function (str) { return str }).join(', ')
}

function creditCard (creditCardNo) {
  creditCardNo = (creditCardNo) || ''
  return creditCardNo.replace(/\D/g, '')
}

function expiryDate (month, year) {
  month = (month.length === 1) ? '0' + month : month
  return month.slice(-2) + '/' + year.slice(-2)
}

function apiPayload (req, cardBrand) {
  return {
    'card_number': creditCard(req.body.cardNo),
    'cvc': req.body.cvc,
    'card_brand': cardBrand,
    'expiry_date': expiryDate(req.body.expiryMonth, req.body.expiryYear),
    'cardholder_name': req.body.cardholderName,
    'address': addressForApi(req.body),
    'accept_header': req.header('accept'),
    'user_agent_header': req.header('user-agent')
  }
}

function authUrl (charge) {
  const authLink = charge.links.find((link) => { return link.rel === 'cardAuth' })
  return authLink.href
}

function chargeUrl (charge) {
  const selfLink = charge.links.find((link) => { return link.rel === 'self' })
  return selfLink.href
}
