module.exports = {

    card: {
      new: '/card_details/:chargeId',
      create: '/card_details',
    },
    connector: {
      charge: {
        show: process.env.CONNECTOR_HOST + "v1/frontend/charges/:chargeId"
      }
    },
    generateRoute: require(__dirname + '/utils/generate_route.js')
};
