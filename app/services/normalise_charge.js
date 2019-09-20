'use strict'

// NPM dependencies
const humps = require('humps')
const lodash = require('lodash')

// Local dependencies
const countries = require('../services/countries')
const normaliseCards = require('../services/normalise_cards')

module.exports = (function () {
  const charge = function (charge, chargeId) {
    const chargeObj = {
      id: chargeId,
      amount: penceToPounds(charge.amount),
      service_return_url: charge.return_url,
      description: charge.description,
      links: charge.links,
      status: charge.status,
      email: charge.email,
      gatewayAccount: _normaliseGatewayAccountDetails(charge.gateway_account)
    }
    if (charge.auth_3ds_data) {
      chargeObj.auth3dsData = _normaliseAuth3dsData(charge.auth_3ds_data)
    }
    if (charge.card_details) {
      chargeObj.cardDetails = _normaliseConfirmationDetails(charge.card_details)
      _normalisePrefilledCardDetails(chargeObj, charge.card_details)
    }
    if (charge.corporate_card_surcharge) {
      chargeObj.corporateCardSurcharge = penceToPounds(charge.corporate_card_surcharge)
    }
    if (charge.total_amount) {
      chargeObj.totalAmount = penceToPounds(charge.total_amount)
    }
    if (charge.wallet_type) {
      chargeObj.walletType = charge.wallet_type
    }
    return chargeObj
  }

  const penceToPounds = function (pence) {
    return (parseInt(pence) / 100).toFixed(2)
  }

  const addressForApi = function (body) {
    return {
      line1: body.addressLine1,
      line2: body.addressLine2,
      city: body.addressCity,
      postcode: body.addressPostcode,
      country: body.addressCountry
    }
  }
  // body is passed by reference
  const addressLines = function (body) {
    if (!body.addressLine1 && body.addressLine2) {
      body.addressLine1 = body.addressLine2
      delete body.addressLine2
    }
  }
  const whitespace = function (body) {
    const toIgnore = [
      'submitCardDetails',
      'csrfToken',
      'chargeId'
    ]

    lodash.forIn(body, function (value, key) {
      if (!lodash.includes(toIgnore, key)) {
        body[key] = value.trim()
      }
    })
  }

  const _normaliseConfirmationDetails = function (cardDetails) {
    cardDetails.cardNumber = '●●●●●●●●●●●●' + cardDetails.last_digits_card_number
    delete cardDetails.last_digits_card_number
    const normalisedDetails = humps.camelizeKeys(cardDetails)
    if (cardDetails.billing_address) {
      normalisedDetails.billingAddress = _normaliseAddress(cardDetails.billing_address)
    }
    return normalisedDetails
  }

  const _normalisePrefilledCardDetails = (chargeObj, cardDetails) => {
    if (cardDetails.cardholder_name) {
      chargeObj.cardholderName = cardDetails.cardholder_name
    }
    if (cardDetails.billing_address) {
      chargeObj.addressLine1 = cardDetails.billing_address.line1
      chargeObj.addressLine2 = cardDetails.billing_address.line2
      chargeObj.addressPostcode = cardDetails.billing_address.postcode
      chargeObj.addressCity = cardDetails.billing_address.city
      chargeObj.countryCode = countries.checkOrDefaultCountryCode(cardDetails.billing_address.country)
    }
  }

  const _normaliseAddress = function (address) {
    return [address.line1,
      address.line2,
      address.city,
      address.postcode,
      countries.translateCountryISOtoName(address.country)].filter(function (str) {
      return str
    }).join(', ')
  }

  const _normaliseGatewayAccountDetails = function (accountDetails) {
    const gatewayAccountDetails = humps.camelizeKeys(accountDetails)
    gatewayAccountDetails.cardTypes = normaliseCards(gatewayAccountDetails.cardTypes)
    return gatewayAccountDetails
  }

  const _normaliseAuth3dsData = function (auth3dsData) {
    return {
      paRequest: auth3dsData.paRequest,
      issuerUrl: auth3dsData.issuerUrl,
      htmlOut: auth3dsData.htmlOut,
      md: auth3dsData.md,
      worldpayChallengeJwt: auth3dsData.worldpayChallengeJwt
    }
  }

  // an empty string is equal to false in soft equality used by filter
  const addressForView = function (body) {
    return [body.addressLine1,
      body.addressLine2,
      body.addressCity,
      body.addressPostcode,
      countries.translateCountryISOtoName(body.addressCountry)].filter(function (str) {
      return str
    }).join(', ')
  }

  const creditCard = function (creditCardNo) {
    creditCardNo = (creditCardNo) || ''
    return creditCardNo.replace(/\D/g, '')
  }

  const expiryDate = function (month, year) {
    month = (month.length === 1) ? '0' + month : month
    return month.slice(-2) + '/' + year.slice(-2)
  }

  const apiPayload = function (req, card) {
    return {
      'card_number': creditCard(req.body.cardNo),
      'cvc': req.body.cvc,
      'card_brand': card.brand,
      'expiry_date': expiryDate(req.body.expiryMonth, req.body.expiryYear),
      'cardholder_name': req.body.cardholderName,
      'card_type': card.type,
      'corporate_card': card.corporate,
      'prepaid': card.prepaid,
      'address': addressForApi(req.body),
      'accept_header': req.header('accept'),
      'user_agent_header': req.header('user-agent')
    }
  }

  return {
    charge,
    addressForApi,
    addressLines,
    whitespace,
    addressForView,
    creditCard,
    expiryDate,
    apiPayload
  }
}())
