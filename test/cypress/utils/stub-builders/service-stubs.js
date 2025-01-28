'use strict'

const { stubBuilder } = require('./stub-builder')
const serviceFixtures = require('../../../fixtures/service.fixtures')

function adminUsersGetService (gatewayAccountId, opts = {}) {
  const path = '/v1/api/services'
  return stubBuilder('GET', path, 200, {
    query: {
      gatewayAccountId
    },
    response: serviceFixtures.validServiceResponse(opts)
  })
}

module.exports = {
  adminUsersGetService
}
