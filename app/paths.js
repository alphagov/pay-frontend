var _ = require('lodash');
var generateRoute = require(__dirname + '/utils/generate_route.js');

if (process.env.CONNECTOR_HOST === undefined) throw new Error('connector host is not defined');
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
      path: '/card_details',
      action: 'post'
    },
    authWaiting: {
      path: '/card_details/:chargeId/auth_waiting',
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
    }
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
    }
  }
};

module.exports = _.extend({}, paths, {generateRoute: generateRoute(paths)});


