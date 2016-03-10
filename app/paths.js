if (process.env.CONNECTOR_HOST === undefined) throw new Error('connector host is not defined');

module.exports = {
    card: {
      new: '/card_details/:chargeId',
      create: '/card_details',
      confirm: '/card_details/:chargeId/confirm',
      capture: '/card_details/:chargeId/confirm',
    },
    charge: {
      show: "/charge/:chargeId?",
    },
    connector: {
      charge: {
        show: process.env.CONNECTOR_HOST + "/v1/frontend/charges/:chargeId",
        updateStatus: process.env.CONNECTOR_HOST + "/v1/frontend/charges/:chargeId/status",
        capture: process.env.CONNECTOR_HOST + "/v1/frontend/charges/:chargeId/capture",
        token: process.env.CONNECTOR_HOST + "/v1/frontend/tokens/:chargeTokenId"
      }
    },
    generateRoute: require(__dirname + '/utils/generate_route.js')
};


