// helper methods for building entities common to many different types of requests
const buildGatewayAccount = function buildGatewayAccount (opts = {}) {
  const structure = {
    'gateway_account_id': opts.gatewayAccountId || 6,
    'allowWebPayments': false,
    'allow_apple_pay': false,
    'allow_google_pay': false,
    'analytics_id': null,
    card_types: buildStandardSupportedCardTypes(),
    'corporate_credit_card_surcharge_amount': 0, // are these needed?
    'corporate_debit_card_surcharge_amount': 0,
    'corporate_prepaid_credit_card_surcharge_amount': 0,
    'corporate_prepaid_debit_card_surcharge_amount': 0,
    'email_collection_mode': 'MANDATORY',
    'email_notifications': {
      'PAYMENT_CONFIRMED': {
        'enabled': true,
        'template_body': null,
        'version': 1
      },
      'REFUND_ISSUED': {
        'enabled': true,
        'template_body': null,
        'version': 1
      }
    },
    'gateway_merchant_id': null,
    'live': false,
    'notifySettings': null,
    'payment_provider': 'sandbox',
    'requires3ds': false,
    'service_name': 'My service',
    'type': 'test',
    'version': 1
  }
  return structure
}

const buildStandardSupportedCardTypes = function buildStandardSupportedCardTypes () {
  const structure = [
    {
      'brand': 'visa',
      'id': 'b9dae820-0d11-4280-b8bb-6a3a320b7e7a',
      'label': 'Visa',
      'requires3ds': false,
      'type': 'DEBIT'
    },
    {
      'brand': 'visa',
      'id': 'b2c53a34-8566-4050-963f-7f20b43f3650',
      'label': 'Visa',
      'requires3ds': false,
      'type': 'CREDIT'
    },
    {
      'brand': 'master-card',
      'id': 'e33c7b30-f2f5-4d9d-ac00-a61d598d353e',
      'label': 'Mastercard',
      'requires3ds': false,
      'type': 'DEBIT'
    },
    {
      'brand': 'master-card',
      'id': 'f9adcba5-3c8e-4bbb-bb29-3d8f1cf152fc',
      'label': 'Mastercard',
      'requires3ds': false,
      'type': 'CREDIT'
    },
    {
      'brand': 'american-express',
      'id': '9cb3f107-391b-4ca9-a42e-27e8a0b277a2',
      'label': 'American Express',
      'requires3ds': false,
      'type': 'CREDIT'
    },
    {
      'brand': 'diners-club',
      'id': 'c36f5a66-ce27-462f-a971-76783eed40e7',
      'label': 'Diners Club',
      'requires3ds': false,
      'type': 'CREDIT'
    },
    {
      'brand': 'discover',
      'id': 'e0f2590d-219f-4627-b693-43fa8bb41583',
      'label': 'Discover',
      'requires3ds': false,
      'type': 'CREDIT'
    },
    {
      'brand': 'jcb',
      'id': '45714fbd-ca7b-4900-9777-084fe5b223be',
      'label': 'Jcb',
      'requires3ds': false,
      'type': 'CREDIT'
    },
    {
      'brand': 'unionpay',
      'id': 'acd5ca07-d27d-43b6-9e2a-bb42699dc644',
      'label': 'Union Pay',
      'requires3ds': false,
      'type': 'CREDIT'
    }
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

const buildChargeDetails = function buildChargeDetails (opts) {
  const chargeId = opts.chargeId || 'ub8de8r5mh4pb49rgm1ismaqfv'
  const structure = {
    'amount': opts.amount || 1000,
    'state': opts.state,
    'description': opts.description || 'Example fixture payment',
    'language': 'en',
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
    structure.card_details = utilFormatPaymentDetails(opts.paymentDetails)
  }
  return structure
}

const buildService = function buildService (opts = {}) {
  const gatewayAccountIds = opts.gateway_account_ids || [ '6' ]
  const externalId = opts.external_id || 'c0e046482d034c2e8392e543d5f4914e'
  const structure = {
    'id': opts.id || 6,
    external_id: externalId,
    'name': 'System Generated',
    gateway_account_ids: gatewayAccountIds,
    '_links': [
      {
        'rel': 'self',
        'method': 'GET',
        'href': `http://localhost:8080/v1/api/services/${externalId}`
      }
    ],
    'service_name': {
      'en': (opts.service_name && opts.service_name.en) || 'Default fixture service'
    },
    'redirect_to_service_immediately_on_terminal_state': false,
    'collect_billing_address': true,
    'current_go_live_stage': 'NOT_STARTED'
  }
  return structure
}

const fixtures = {
  // intitial charge details returned have different API surface than charge others
  validChargeCreatedByToken: (opts = {}) => {
    const data = {
      'amount': opts.amount || 1000,
      'cardDetails': null,
      'corporateSurcharge': null,
      'delayedCapture': false,
      'description': opts.description || 'Example fixture payment',
      'email': null,
      'externalId': opts.chargeId || 'ub8de8r5mh4pb49rgm1ismaqfv',
      gatewayAccount: buildGatewayAccount(opts),
      'gatewayTransactionId': null,
      'language': 'ENGLISH',
      'paymentGatewayName': 'SANDBOX',
      'providerSessionId': null,
      'reference': 'my payment reference',
      'refunds': [],
      'returnUrl': '/?confirm',
      'status': 'CREATED',
      'version': 1,
      'walletType': null,
      'events': [{
        'gatewayEventDate': null,
        'status': 'CREATED',
        'version': 1
      }]
    }
    return data
  },

  validChargeDetails: (opts = {}) => buildChargeDetails(opts),
  validService: (opts = {}) => buildService(opts),
  validChargeCardDetailsAuthorised: () => ({ 'status': 'AUTHORISATION SUCCESS' }),

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
