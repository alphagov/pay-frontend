'use strict'

const Sentry = require('@sentry/browser')

function initialiseSentry () {
  Sentry.init({
    dsn: window.sentryDSN,
    environment: window.environment
  })
}

module.exports = {
  initialiseSentry
}
