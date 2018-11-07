'use strict'

// local dependencies
const baseClient = require('./base_client/base_client')

module.exports = {
    ping: function () {
        if (process.env.FORWARD_PROXY_URL) {
            return baseClient.get(`${process.env.FORWARD_PROXY_URL}/nginx_status`)
        }
        Promise.resolve(true)
    }
}
