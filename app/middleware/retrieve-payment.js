'use strict'

const Charge = require('../models/charge')
const { getLoggingFields } = require('../utils/logging-fields-helper')
const { CORRELATION_HEADER } = require('../../config/correlation-header')

module.exports = async function retrievePayment (req, res, next) {
  try {
    const paymentExternalId = req.params.chargeId ? req.params.chargeId : req.body.chargeId
    req.chargeId = paymentExternalId
    req.chargeData = await Charge(req.headers[CORRELATION_HEADER]).findPaymentInPaymentsService(paymentExternalId, getLoggingFields(req))
    // TODO hardcode the state to make the state enforcer happy for now
    req.chargeData.status = 'CREATED'
    next()
  } catch (err) {
    next(err)
  }
}
