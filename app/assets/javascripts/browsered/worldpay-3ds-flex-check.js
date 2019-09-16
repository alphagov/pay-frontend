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
  return Charge.worldpay_3ds_flex_ddc_url.startsWith(origin)
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

  const worldpayIframe = document.createElement('iframe')
  const worldpayForm = document.createElement('form')
  const worldpayInputBin = document.createElement('input')
  const worldpayInputJwt = document.createElement('input')
  const worldpayScript = document.createElement('script')
  worldpayIframe.id = 'worldpayIframe'
  worldpayInputBin.name = 'Bin'
  worldpayInputJwt.name = 'Jwt'
  worldpayInputBin.type = 'hidden'
  worldpayInputJwt.type = 'hidden'
  worldpayForm.action = Charge.worldpay_3ds_flex_ddc_url
  worldpayForm.id = 'collectionForm'
  worldpayForm.method = 'POST'
  worldpayForm.name = 'devicedata'
  worldpayInputBin.value = form.elements['cardNo'].value
  worldpayInputJwt.value = Charge.worldpay_3ds_flex_ddc_jwt
  worldpayScript.innerHTML = `
      document.getElementById('collectionForm').submit();
    ;`
  worldpayIframe.style.display = 'none'
  worldpayForm.appendChild(worldpayInputBin)
  worldpayForm.appendChild(worldpayInputJwt)

  const worldpayWrap = document.createElement('div')
  worldpayWrap.appendChild(worldpayForm)
  worldpayWrap.appendChild(worldpayScript)
  worldpayIframe.src = `data:text/html;charset=utf-8,${encodeURIComponent(worldpayWrap.innerHTML)}`
  document.getElementById('worldpay3DSFlexWrap').appendChild(worldpayIframe)
}

module.exports = {
  submitWithWorldpay3dsFlex
}
