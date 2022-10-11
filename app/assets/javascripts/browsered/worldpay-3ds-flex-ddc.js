'use strict'

const toggleWaiting = () => {
  document.getElementById('card-details-wrap').classList.toggle('hidden')
  document.getElementById('spinner').classList.toggle('hidden')
  document.getElementById('error-summary').classList.add('hidden')

  var paymentDetailsHeader = document.querySelector('.web-payment-button-section')
  if (typeof paymentDetailsHeader !== 'undefined' && paymentDetailsHeader !== null) {
    paymentDetailsHeader.style.display = 'none'
  }

  var applePayContainer = document.querySelector('.apple-pay-container')
  if (typeof applePayContainer !== 'undefined' && applePayContainer !== null) {
    applePayContainer.style.display = 'none'
  }

  var googlePayContainer = document.querySelector('.google-pay-container')
  if (typeof googlePayContainer !== 'undefined' && googlePayContainer !== null) {
    googlePayContainer.style.display = 'none'
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

const updateDdcStatusField = (status) => {
  document.getElementById('worldpay3dsFlexDdcStatus').value = status
}

const submitWithWorldpay3dsFlexDdcResult = form => {
  const DDC_TIMEOUT_IN_MILLISECONDS = 30000

  const worldpayNoResponseTimeout = window.setTimeout(() => {
    updateDdcStatusField(`DDC timeout after ${DDC_TIMEOUT_IN_MILLISECONDS} milliseconds`)
    form.submit()
  }, DDC_TIMEOUT_IN_MILLISECONDS)

  window.addEventListener('message', function (event) {
    if (checkOriginHostName(event.origin)) {
      const { MessageType, SessionId, Status } = JSON.parse(event.data)
      if (MessageType === 'profile.completed') {
        if (Status === true && typeof SessionId === 'string') {
          updateDdcStatusField('valid DDC result')
          addWorldpaySessionIdToForm(form, SessionId)
        } else if (!Status) {
          updateDdcStatusField('DDC result did not have Status of true')
        } else {
          updateDdcStatusField('no SessionID string in DDC result')
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
    iFrameContent.getElementById('input-bin').value = form.elements.cardNo.value
    innerForm.submit()
    updateDdcStatusField('DDC initiated')
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
