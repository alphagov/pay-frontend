'use strict'

const toggleWaiting = () => {
  document.getElementById('card-details-wrap').classList.toggle('hidden')
  document.getElementById('spinner').classList.toggle('hidden')
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

const submitWithWorldpay3dsFlex = form => {
  const worldpayNoResponseTimeout = window.setTimeout(() => {
    form.submit()
  }, 10000)

  window.addEventListener('message', function (event) {
    if (checkOriginHostName(event.origin)) {
      const { MessageType, SessionId, Status } = JSON.parse(event.data)
      if (Status === true && MessageType === 'profile.completed' && typeof SessionId === 'string') {
        window.clearTimeout(worldpayNoResponseTimeout)
        addWorldpaySessionIdToForm(form, SessionId)
      }
      form.submit()
    }
  })

  toggleWaiting()

  const iFrame = document.getElementById('worldpayIframe')
  const innerDoc = iFrame.contentWindow.document
  const post3dsCheck = iFrameContent => {
    const innerForm = iFrameContent.getElementById('collectionForm')
    iFrameContent.getElementById('input-jwt').value = Charge.worldpay_3ds_flex_ddc_jwt
    innerForm.action = Charge.worldpay_3ds_flex_ddc_url
    iFrameContent.getElementById('input-bin').value = form.elements['cardNo'].value
    innerForm.submit()
  }

  if (innerDoc.readyState === 'complete') {
    post3dsCheck(innerDoc)
  } else {
    innerDoc.addEventListener('readystatechange', function () {
      post3dsCheck(innerDoc)
    }, false)
  }
}

module.exports = {
  submitWithWorldpay3dsFlex
}
