'use strict'

const toggleWaiting = () => {
  document.getElementById('card-details-wrap').classList.toggle('hidden')
  document.getElementById('spinner').classList.toggle('hidden')
  document.getElementById('error-summary').classList.add('hidden')

  var paymentMethodSubmitElement = document.getElementById('apple-pay-payment-method-submit')
  if (typeof paymentMethodSubmitElement !== 'undefined' && paymentMethodSubmitElement !== null) {
    paymentMethodSubmitElement.classList.add('hidden')
  }

  paymentMethodSubmitElement = document.getElementById('google-pay-payment-method-submit')
  if (typeof paymentMethodSubmitElement !== 'undefined' && paymentMethodSubmitElement !== null) {
    paymentMethodSubmitElement.classList.add('hidden')
  }

  var paymentMethodDivider = document.getElementById('payment-method-divider')
  if (typeof paymentMethodDivider !== 'undefined' && paymentMethodDivider !== null) {
    paymentMethodDivider.classList.add('hidden')
    paymentMethodDivider.classList.remove('pay-divider')
    document.getElementById('payment-method-divider-word').classList.add('hidden')
  }
}

const addWorldpaySessionIdToForm = (form, worldpaySessionId) => {
  const worldpaySessionIdFormInput = document.createElement('input')
  worldpaySessionIdFormInput.name = 'worldpay3dsFlexDdcResult'
  worldpaySessionIdFormInput.type = 'hidden'
  worldpaySessionIdFormInput.value = worldpaySessionId
  form.appendChild(worldpaySessionIdFormInput)
}

const checkOriginHostName = origin => {
  return Charge.worldpay_3ds_flex_ddc_url.lastIndexOf(origin, 0) === 0
}

const submitWithWorldpay3dsFlexDdcResult = form => {
  const worldpayNoResponseTimeout = window.setTimeout(() => {
    form.submit()
  }, 10000)

  window.addEventListener('message', function (event) {
    if (checkOriginHostName(event.origin)) {
      const { MessageType, SessionId, Status } = JSON.parse(event.data)
      if (MessageType === 'profile.completed') {
        if (Status === true && typeof SessionId === 'string') {
          addWorldpaySessionIdToForm(form, SessionId)
        }
        window.clearTimeout(worldpayNoResponseTimeout)
        form.submit()
      }
    }
  })

  toggleWaiting()

  const iFrame = document.getElementById('worldpay3dsFlexDdcIframe')
  const innerDoc = iFrame.contentWindow.document
  const initiateDeviceDataCollection = iFrameContent => {
    const innerForm = iFrameContent.getElementById('collectionForm')
    innerForm.action = Charge.worldpay_3ds_flex_ddc_url
    iFrameContent.getElementById('input-jwt').value = Charge.worldpay_3ds_flex_ddc_jwt
    iFrameContent.getElementById('input-bin').value = form.elements['cardNo'].value
    innerForm.submit()
  }

  if (innerDoc.readyState === 'complete') {
    initiateDeviceDataCollection(innerDoc)
  } else {
    innerDoc.addEventListener('readystatechange', function () {
      if (innerDoc.readyState === 'complete') {
        initiateDeviceDataCollection(innerDoc)
      }
    }, false)
  }
}

module.exports = {
  submitWithWorldpay3dsFlexDdcResult
}
