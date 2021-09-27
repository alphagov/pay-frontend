'use strict'

const logger = require('../../utils/logger')(__filename)
const { getLoggingFields } = require('../../utils/logging-fields-helper')
const ConnectorClient = require('../../services/clients/connector.client')
const { setSessionVariable } = require('../../utils/cookies')
const paths = require('../../paths')

module.exports = async function authorise(req, res) {
    const connector = ConnectorClient({ correlationId: req.correlationId })
    const { chargeId } = req
    const { paymentMethodId } = req.body
    try {
        const authResponse = await connector.chargeAuthWithStripeWallet(chargeId, paymentMethodId)
        setSessionVariable(req, `ch_${(chargeId)}.stripewebPaymentAuthResponse`, {
            statusCode: authResponse.statusCode
        })
        logger.info(`Successful auth for Stripe wallet payment. ChargeID: ${chargeId}`, getLoggingFields(req))
        res.status(200)
        res.send({ url: paths.generateRoute('card.authWaiting', { chargeId }) })
    } catch (err) {
        logger.error(`Error while trying to authorise ${provider} Pay payment`, {
            ...getLoggingFields(req),
            error: err
        })
        res.status(200)
        res.send({ url: paths.generateRoute('card.authWaiting', { chargeId }) })
    }
}