if (process.env.CONNECTOR_HOST === undefined) throw new Error('connector host is not defined');
// please structure each route as follows
// name: {
//    path: "/foo"
//    action: get
//}
// the action while not used directly here is used so we can match to the named
// routes when we have duplicate paths on different actions

module.exports = {
    card: {
      new: {
        path: '/card_details/:chargeId',
        action: 'get'
      },
      create: {
        path: '/card_details',
        action: 'post'
      },
      confirm: {
        path: '/card_details/:chargeId/confirm',
        action: 'get'
      },
      capture: {
        path: '/card_details/:chargeId/confirm',
        action: 'post'
      }
    },
    charge: {
      show: {
        path: "/charge/:chargeId",
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
      token: {
        path: process.env.CONNECTOR_HOST + "/v1/frontend/tokens/:chargeTokenId",
        action: 'get'
      }
    },
    generateRoute: require(__dirname + '/utils/generate_route.js')
};


