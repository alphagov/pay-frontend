const chargeModel = require('../models/charge.js')
const StateModel = require('../models/state.js')
const views = require('../utils/views.js')
const CORRELATION_HEADER = require('../utils/correlation_header.js').CORRELATION_HEADER
const withAnalyticsError = require('../utils/analytics.js').withAnalyticsError

const logger = require('pino')()

const CANCELABLE_STATES = [
  StateModel.CREATED,
  StateModel.ENTERING_CARD_DETAILS,
  StateModel.AUTH_SUCCESS,
  StateModel.AUTH_READY,
  StateModel.CAPTURE_READY,
  StateModel.AUTH_3DS_REQUIRED,
  StateModel.AUTH_3DS_READY
]

module.exports = {
  return: function (req, res) {
    const correlationId = req.headers[CORRELATION_HEADER] || ''
    const _views = views.create({})
    const doRedirect = () => res.redirect(req.chargeData.return_url)

    if (CANCELABLE_STATES.includes(req.chargeData.status)) {
      return chargeModel.cancel(req.chargeId, correlationId)
          .then(() => logger.warn('Return controller cancelled payment', {'chargeId': req.chargeId}))
          .then(doRedirect)
          .catch(() => {
            logger.error('Return controller failed to cancel payment', {'chargeId': req.chargeId})
            _views.display(res, 'SYSTEM_ERROR', withAnalyticsError())
          })
    } else {
      return doRedirect()
    }
  }
}
