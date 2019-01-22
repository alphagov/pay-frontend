'use strict'

const { prepareRequestObject } = require('./helpers')

module.exports = () => {
  const { supportedInstruments, details, options } = prepareRequestObject('standard')
  const request = new PaymentRequest(supportedInstruments, details, options)

  request.show()
    .then(result => {
      const payload = result.toJSON()
      payload.csrfToken = document.getElementById('csrf').value
      payload.chargeId = window.paymentDetails.chargeID
      return fetch(`/payment-request/${window.paymentDetails.chargeID}`, {
        method: 'POST',
        redirect: 'follow',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }).then(response => {
        if (response.status === 200) {
          result.complete('success')
          return window.location.href = response.url
        } else {
          result.complete('fail')
          return window.location.href = response.url
        }
      }).catch(() => {
        result.complete('fail')
        return window.location.href = response.url
      })
    }).catch(err => {
      return err
    })
}
