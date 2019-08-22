'use strict'

const toggleWaiting = () => {
  document.getElementById('card-details-wrap').classList.toggle('hidden')
  document.getElementById('spinner').classList.toggle('hidden')
}

const addWorldPaySessionIdToForm = (form, worldpaySessionId) => {
  const worldpaySessionIdFormInput = document.createElement('input')
  worldpaySessionIdFormInput.name = 'worldpay3dsFlexDdcResult'
  worldpaySessionIdFormInput.type = 'hidden'
  worldpaySessionIdFormInput.value = worldpaySessionId
  form.appendChild(worldpaySessionIdFormInput)
}

const checkOriginHostName = origin => {
  return Charge.worldpay_3ds_flex_ddc_url.startsWith(origin)
}

const submitWithWorldPay3dsFlex = form => {
  let result = ''
  window.addEventListener('message', function (event) {
    if (checkOriginHostName(event.origin)) {
      const { MessageType, SessionId, Status } = JSON.parse(event.data)
      if (Status === true && MessageType === 'profile.completed') {
        addWorldPaySessionIdToForm(form, SessionId)
      }
      form.submit()
    }
  })

  if (Charge.worldpay_3ds_flex_ddc_jwt !== '') {
    toggleWaiting()

    const worldPayIframe = document.createElement('iframe')
    const worldPayWrap = document.createElement('div')
    const worldPayForm = document.createElement('form')
    const worldPayInputBin = document.createElement('input')
    const worldPayInputJWT = document.createElement('input')
    const worldPayScript = document.createElement('script')
    worldPayIframe.id = 'worldPayIframe'
    worldPayInputBin.name = 'Bin'
    worldPayInputJWT.name = 'JWT'
    worldPayInputBin.type = 'hidden'
    worldPayInputJWT.type = 'hidden'
    worldPayForm.action = Charge.worldpay_3ds_flex_ddc_url
    worldPayForm.id = 'collectionForm'
    worldPayForm.method = 'POST'
    worldPayForm.name = 'devicedata'
    worldPayInputBin.value = form.elements['cardNo'].value
    worldPayInputJWT.value = Charge.worldpay_3ds_flex_ddc_jwt
    worldPayScript.innerHTML = `
      document.getElementById('collectionForm').submit();
    ;`
    worldPayIframe.style.display = 'none'
    worldPayForm.appendChild(worldPayInputBin)
    worldPayForm.appendChild(worldPayInputJWT)
    worldPayWrap.appendChild(worldPayForm)
    worldPayWrap.appendChild(worldPayScript)
    worldPayIframe.src = `data:text/html;charset=utf-8,${encodeURIComponent(worldPayWrap.innerHTML)}`

    document.getElementById('worldPay3DSFlexWrap').appendChild(worldPayIframe)
  }

  return result
}

module.exports = {
  submitWithWorldPay3dsFlex
}
