const lodash = require('lodash')
const pactBase = require('./pact_base')()

// helper methods for building entities common to many different types of requests
const buildGatewayAccount = function buildGatewayAccount (opts = {}) {
  const cardTypes = opts.cardTypes
    ? lodash.flatMap(opts.cardTypes, buildCardType)
    : buildStandardSupportedCardTypes()
  const structure = {
    'gateway_account_id': opts.gatewayAccountId || 6,
    'allow_apple_pay': opts.allowApplePay || false,
    'allow_google_pay': opts.allowGooglePay || false,
    'gateway_merchant_id': opts.gatewayMerchantId || null,
    'analytics_id': opts.analyticsId || 'an-analytics-id',
    'corporate_credit_card_surcharge_amount': 0,
    'corporate_debit_card_surcharge_amount': 0,
    'corporate_prepaid_credit_card_surcharge_amount': 0,
    'corporate_prepaid_debit_card_surcharge_amount': 0,
    'email_collection_mode': 'MANDATORY',
    'live': false,
    'payment_provider': 'sandbox',
    'requires3ds': false,
    'service_name': 'My service',
    'type': opts.gatewayAccountType || 'test',
    'version': 1,
    'integration_version_3ds': opts.integrationVersion3ds || 1,
    card_types: cardTypes
  }
  return structure
}

const buildCardType = function buildCardType (opts) {
  return {
    'brand': opts.brand || 'visa',
    'id': opts.id || 'an-id',
    'label': opts.label || 'Visa',
    'requires3ds': opts.requires3ds || false,
    'type': opts.type || 'DEBIT'
  }
}

const buildStandardSupportedCardTypes = function buildStandardSupportedCardTypes () {
  const structure = [
    buildCardType({
      brand: 'visa',
      id: 'b9dae820-0d11-4280-b8bb-6a3a320b7e7a',
      label: 'Visa',
      requires3ds: false,
      type: 'DEBIT'
    }),
    buildCardType({
      brand: 'visa',
      id: 'b2c53a34-8566-4050-963f-7f20b43f3650',
      label: 'Visa',
      requires3ds: false,
      type: 'CREDIT'
    }),
    buildCardType({
      brand: 'master-card',
      id: 'e33c7b30-f2f5-4d9d-ac00-a61d598d353e',
      label: 'Mastercard',
      requires3ds: false,
      type: 'DEBIT'
    }),
    buildCardType({
      brand: 'master-card',
      id: 'f9adcba5-3c8e-4bbb-bb29-3d8f1cf152fc',
      label: 'Mastercard',
      requires3ds: false,
      type: 'CREDIT'
    }),
    buildCardType({
      brand: 'american-express',
      id: '9cb3f107-391b-4ca9-a42e-27e8a0b277a2',
      label: 'American Express',
      requires3ds: false,
      type: 'CREDIT'
    }),
    buildCardType({
      brand: 'diners-club',
      id: 'c36f5a66-ce27-462f-a971-76783eed40e7',
      label: 'Diners Club',
      requires3ds: false,
      type: 'CREDIT'
    }),
    buildCardType({
      brand: 'discover',
      id: 'e0f2590d-219f-4627-b693-43fa8bb41583',
      label: 'Discover',
      requires3ds: false,
      type: 'CREDIT'
    }),
    buildCardType({
      brand: 'jcb',
      id: '45714fbd-ca7b-4900-9777-084fe5b223be',
      label: 'Jcb',
      requires3ds: false,
      type: 'CREDIT'
    }),
    buildCardType({
      brand: 'unionpay',
      id: 'acd5ca07-d27d-43b6-9e2a-bb42699dc644',
      label: 'Union Pay',
      requires3ds: false,
      type: 'CREDIT'
    })
  ]
  return structure
}

// @TODO(sfount) - consider if this is the best way to stub these details
// format payment details as expected attached to a valid charge
const utilFormatPaymentDetails = function utilFormatPaymentDetails (details) {
  const structure = {
    'last_digits_card_number': details.cardNumber.substr(-4),
    'first_digits_card_number': details.cardNumber.substr(6),
    'cardholder_name': details.name,
    'expiry_date': `${details.expiryMonth}/${details.expiryYear}`,
    'billing_address': {
      'line1': details.addressLine1,
      'line2': '',
      'postcode': details.postcode,
      'city': details.city,
      'county': null,
      'country': 'GB'
    },
    'card_brand': 'Visa'
  }
  return structure
}

const utilFormatPrefilledCardHolderDetails = (details) => {
  const structure = {
    'cardholder_name': details.cardholderName || null,
    'billing_address': {
      'line1': details.billingAddress.addressLine1 || null,
      'line2': details.billingAddress.addressLine2 || null,
      'postcode': details.billingAddress.postcode || null,
      'city': details.billingAddress.city || null,
      'county': null,
      'country': details.billingAddress.country || null
    },
    'card_brand': ''
  }
  return structure
}

const buildAuth3dsDetails = function buildAuth3dsDetails (opts) {
  const data = {}
  if (opts.worldpayChallengeJwt) {
    data.worldpayChallengeJwt = opts.worldpayChallengeJwt
  }
  if (opts.paRequest) {
    data.paRequest = opts.paRequest
  }
  if (opts.issuerUrl) {
    data.issuerUrl = opts.issuerUrl
  }
  if (opts.htmlOut) {
    data.htmlOut = opts.htmlOut
  }
  if (opts.md) {
    data.md = opts.md
  }

  return data
}

const buildChargeDetails = function buildChargeDetails (opts) {
  const chargeId = opts.chargeId || 'ub8de8r5mh4pb49rgm1ismaqfv'
  const data = {
    'amount': opts.amount || 1000,
    'state': opts.state || {
      'status': 'created',
      'finished': false
    },
    'description': opts.description || 'Example fixture payment',
    'language': opts.language || 'en',
    'status': opts.status || 'CREATED',
    charge_id: chargeId,
    'return_url': opts.returnUrl || '/?confirm',
    'created_date': '2019-02-12T17:53:31.307Z',
    'delayed_capture': false,
    'gateway_account': buildGatewayAccount(opts)
  }

  if (opts.state) { data.state = opts.state }

  if (opts.paymentDetails) {
    data.email = opts.paymentDetails.email
    data.card_details = utilFormatPaymentDetails(opts.paymentDetails)
  }

  if (opts.auth3dsData) {
    data.auth_3ds_data = buildAuth3dsDetails(opts.auth3dsData)
  }

  return {
    getPactified: () => {
      return pactBase.pactify(data)
    },
    getPlain: () => {
      return data
    }
  }
}

const buildChargeDetailsWithPrefilledCardHolderDeatils = (opts) => {
  const chargeId = opts.chargeId || 'ub8de8r5mh4pb49rgm1ismaqfv'
  const structure = {
    'amount': opts.amount || 1000,
    'state': opts.state,
    'description': opts.description || 'Example fixture payment',
    'language': opts.language || 'en',
    'status': opts.status,
    'links': [{
      'rel': 'self',
      'method': 'GET',
      'href': `https://connector:9300/v1/frontend/charges/${chargeId}`
    }, {
      'rel': 'cardAuth',
      'method': 'POST',
      'href': `https://connector:9300/v1/frontend/charges/${chargeId}/cards`
    }, {
      'rel': 'cardCapture',
      'method': 'POST',
      'href': `https://connector:9300/v1/frontend/charges/${chargeId}/capture`
    }],
    charge_id: chargeId,
    'return_url': opts.returnUrl || '/?confirm',
    // 'created_date': '2019-02-12T17:53:31.307Z',
    'delayed_capture': false,
    'gateway_account': buildGatewayAccount(opts)
  }

  if (opts.state) { structure.state = opts.state }

  if (opts.paymentDetails) {
    structure.email = opts.paymentDetails.email
    structure.card_details = utilFormatPrefilledCardHolderDetails(opts.paymentDetails)
  }
  return structure
}

const fixtures = {
  tokenResponse: (opts = {}) => {
    const data = {
      'used': opts.used,
      'charge': {
        'externalId': opts.chargeExternalId
      }
    }
    return {
      getPactified: () => {
        return pactBase.pactify(data)
      },
      getPlain: () => {
        return data
      }
    }
  },

  // intitial charge details returned have different API surface than charge others
  validChargeCreatedByToken: (opts = { 'used': false }) => {
    console.log('state passed in: ' + opts.status)
    const data = {
      'used': opts.used,
      'charge': {
        'amount': opts.amount || 1000,
        'cardDetails': null,
        'corporateSurcharge': null,
        'delayedCapture': false,
        'description': opts.description || 'Example fixture payment',
        'email': null,
        'externalId': opts.chargeId || 'ub8de8r5mh4pb49rgm1ismaqfv',
        'gatewayAccount': buildGatewayAccount(opts),
        'gatewayTransactionId': null,
        'language': 'ENGLISH',
        'paymentGatewayName': 'SANDBOX',
        'providerSessionId': null,
        'reference': 'my payment reference',
        'refunds': [],
        'returnUrl': '/?confirm',
        'status': opts.status || 'CREATED',
        'version': 1,
        'walletType': null,
        'events': [{
          'gatewayEventDate': null,
          'status': 'CREATED',
          'version': 1
        }]
      }
    }
    return data
  },

  validChargeDetails: (opts = {}) => buildChargeDetails(opts),

  validChargeCardDetailsAuthorised: () => {
    const data = { 'status': 'AUTHORISATION SUCCESS' }
    return {
      getPactified: () => {
        return pactBase.pactify(data)
      },
      getPlain: () => {
        return data
      }
    }
  },

  validAuthorisationRequest: () => {
    const data = {
      'card_number': '371449635398431',
      'cvc': '1234',
      'expiry_date': '11/99',
      'card_brand': 'american-express',
      'cardholder_name': 'Scrooge McDuck',
      'accept_header': 'text/html',
      'user_agent_header': 'Mozilla/5.0',
      'prepaid': 'NOT_PREPAID',
      'worldpay_3ds_flex_ddc_result': '96c3fcf6-d90a-467e-a224-107f70052528',
      'address': {
        'line1': 'The Money Pool',
        'city': 'London',
        'postcode': 'DO11 4RS',
        'country': 'GB'
      }
    }
    return {
      getPactified: () => {
        return pactBase.pactify(data)
      },
      getPlain: () => {
        return data
      }
    }
  },

  validChargeDetailsWithPrefilledCardHolderDetails: (opts = {}) => buildChargeDetailsWithPrefilledCardHolderDeatils(opts),

  validCardDetails: () => {
    const data = {
      'brand': 'visa',
      'type': 'C',
      'label': 'VISA CREDIT',
      'corporate': false,
      'prepaid': 'UNKNOWN'
    }
    return data
  }
}

module.exports = fixtures
