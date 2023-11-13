'use strict'

// eslint-disable-next-line no-var
var generateRoute = require('./utils/generate-route.js')

if (process.env.CONNECTOR_HOST === undefined) throw new Error('CONNECTOR_HOST environment variable is not defined')
// please structure each route as follows
// name: {
//    path: "/foo"
//    action: get
// }
// the action while not used directly here is used so we can match to the named
// routes when we have duplicate paths on different actions

const paths = {
  log: {
    path: '/log/:chargeId',
    action: 'post'
  },
  card: {
    new: {
      path: '/card_details/:chargeId',
      action: 'get'
    },
    create: {
      path: '/card_details/:chargeId',
      action: 'post'
    },
    authWaiting: {
      path: '/card_details/:chargeId/auth_waiting',
      action: 'get'
    },
    auth3dsRequired: {
      path: '/card_details/:chargeId/3ds_required',
      action: 'get'
    },
    auth3dsRequiredIn: {
      path: '/card_details/:chargeId/3ds_required_in',
      action: 'post'
    },
    auth3dsRequiredInEpdq: {
      path: '/card_details/:chargeId/3ds_required_in/epdq',
      action: 'post'
    },
    auth3dsRequiredOut: {
      path: '/card_details/:chargeId/3ds_required_out',
      action: 'get'
    },
    auth3dsHandler: {
      path: '/card_details/:chargeId/3ds_handler',
      action: 'post'
    },
    captureWaiting: {
      path: '/card_details/:chargeId/capture_waiting',
      action: 'get'
    },
    confirm: {
      path: '/card_details/:chargeId/confirm',
      action: 'get'
    },
    capture: {
      path: '/card_details/:chargeId/confirm',
      action: 'post'
    },
    cancel: {
      path: '/card_details/:chargeId/cancel',
      action: 'post'
    },
    checkCard: {
      path: '/check_card/:chargeId',
      action: 'post'
    },
    return: {
      path: '/return/:chargeId',
      action: 'get'
    }
  },
  applePay: {
    session: {
      path: '/apple-pay-merchant-validation',
      action: 'post'
    }
  },
  webPayments: {
    authRequest: {
      path: '/web-payments-auth-request/:wallet/:chargeId',
      action: 'post'
    },
    handlePaymentResponse: {
      path: '/handle-payment-response/:chargeId',
      action: 'get'
    },
    handlePaymentResponseNew: {
      path: '/handle-payment-response/:wallet/:chargeId',
      action: 'get'
    }
  },
  secure: {
    get: {
      path: '/secure/:chargeTokenId',
      action: 'get'
    },
    post: {
      path: '/secure/',
      action: 'post'
    }
  },
  static: {
    naxsi_error: {
      path: '/request-denied',
      action: 'get',
      message: 'An invalid character was entered, please try again'
    },

    humans: {
      path: '/humans.txt',
      action: 'get'
    }
  }
}

paths.external = {
  card: {
    auth3dsRequiredIn: {
      path: paths.card.auth3dsRequiredIn.path,
      action: 'post'
    }
  }
}

paths.generateRoute = generateRoute(paths)

module.exports = paths
