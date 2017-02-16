var _ = require('lodash');
var generateRoute = require(__dirname + '/utils/generate_route.js');

if (process.env.CONNECTOR_HOST === undefined) throw new Error('CONNECTOR_HOST environment variable is not defined');
//if (process.env.FRONTEND_HOST === undefined) throw new Error('FRONTEND_HOST environment variable is not defined');
// please structure each route as follows
// name: {
//    path: "/foo"
//    action: get
//}
// the action while not used directly here is used so we can match to the named
// routes when we have duplicate paths on different actions

var paths = {
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
    },
  },
  secure: {
    get: {
      path: "/secure/:chargeTokenId",
      action: 'get'
    },
    post: {
      path: "/secure/",
      action: 'post'
    }
  },
  static: {
    privacy: {
      path:"/privacy",
      action: 'get'
    },

    naxsi_error: {
      path:"/request-denied",
      action: 'get',
      message: "An invalid character was entered, please try again"
    },

    humans: {
      path:"/humans.txt",
      action: 'get'
    }
  },
  connectorCharge: {
    show: {
      path: process.env.CONNECTOR_HOST + "/v1/frontend/charges/:chargeId",
      action: 'get'
    },
    updateStatus: {
      path: process.env.CONNECTOR_HOST + "/v1/frontend/charges/:chargeId/status",
      action: 'put'
    },
    capture: {
      path: process.env.CONNECTOR_HOST + "/v1/frontend/charges/:chargeId/capture",
      action: 'put'
    },
    cancel: {
      path: process.env.CONNECTOR_HOST + "/v1/frontend/charges/:chargeId/cancel",
      action: 'post'
    },
    findByToken: {
      path: process.env.CONNECTOR_HOST + "/v1/frontend/tokens/:chargeTokenId/charge",
      action: 'get'
    },
    token: {
      path: process.env.CONNECTOR_HOST + "/v1/frontend/tokens/:chargeTokenId",
      action: 'delete'
    },
    allCards: {
      path: process.env.CONNECTOR_HOST + "/v1/api/card-types",
      action: 'get'
    },
    threeDs: {
      path: process.env.CONNECTOR_HOST + "/v1/frontend/charges/:chargeId/3ds",
      action: 'post'
    },
  }
};

var extendedPaths = _.extend({}, paths, {
  external: {
    card: {
      auth3dsRequiredIn: {
        path: process.env.FRONTEND_HOST + paths.card.auth3dsRequiredIn.path,
        action: 'post'
      }
    }
  }
});

module.exports = _.extend({}, extendedPaths, {generateRoute: generateRoute(extendedPaths)});


