'use strict'

const { getGooglePaymentsConfiguration, showErrorSummary } = require('./helpers')
const { toggleSubmitButtons, showSpinnerAndHideMainContent, hideSpinnerAndShowMainContent } = require('../helpers')
const { email_collection_mode } = window.Charge // eslint-disable-line camelcase

const submitGooglePayAuthRequest = (paymentResponse) => {
  const requestBody = {
    paymentResponse: paymentResponse
  }

  if (typeof Charge.googlePayWorldpay3dsFlexDeviceDataCollectionStatus === 'string') {
    requestBody.worldpay3dsFlexDdcStatus = Charge.googlePayWorldpay3dsFlexDeviceDataCollectionStatus
  }

  if (typeof Charge.googlePayWorldpay3dsFlexDeviceDataCollectionResult === 'string') {
    requestBody.worldpay3dsFlexDdcResult = Charge.googlePayWorldpay3dsFlexDeviceDataCollectionResult
  }

  return fetch(`/web-payments-auth-request/google/${window.paymentDetails.chargeID}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'Accept-for-HTML': document.body.getAttribute('data-accept-header') || '*/*'
    },
    body: JSON.stringify(requestBody)
  })
    .then(response => {
      ga('send', 'event', 'Google Pay', 'Successful', 'auth/capture request')
      if (response.status >= 200 && response.status < 300) {
        return response.json().then(data => {
          window.location.href = data.url
        })
      } else {
        hideSpinnerAndShowMainContent()
        toggleSubmitButtons()
        showErrorSummary(i18n.fieldErrors.webPayments.failureTitle, i18n.fieldErrors.webPayments.failureBody)
        ga('send', 'event', 'Google Pay', 'Error', 'During authorisation/capture')
      }
    })
    .catch(err => {
      hideSpinnerAndShowMainContent()
      toggleSubmitButtons()
      showErrorSummary(i18n.fieldErrors.webPayments.failureTitle, i18n.fieldErrors.webPayments.failureBody)
      ga('send', 'event', 'Google Pay', 'Error', 'During authorisation/capture')
      return err
    })
}

const checkOriginHostName = origin => {
  return Charge.worldpay_3ds_flex_ddc_url.lastIndexOf(origin, 0) === 0
}

const performDeviceDataCollectionForGooglePay = (paymentData) => {
  const deviceDataCollectionFinishedEventListener = event => {
    if (checkOriginHostName(event.origin) && event.source === iframeWindow) {
      const { MessageType, SessionId, Status } = JSON.parse(event.data)
      if (MessageType === 'profile.completed') {
        if (Status === true && typeof SessionId === 'string') {
          Charge.googlePayWorldpay3dsFlexDeviceDataCollectionStatus = 'valid DDC result'
          Charge.googlePayWorldpay3dsFlexDeviceDataCollectionResult = SessionId
        } else if (!Status) {
          Charge.googlePayWorldpay3dsFlexDeviceDataCollectionStatus = 'DDC result did not have Status of true'
        } else {
          Charge.googlePayWorldpay3dsFlexDeviceDataCollectionStatus = 'no SessionID string in DDC result'
        }
        window.clearTimeout(deviceDataCollectionTimeout)
        window.removeEventListener('message', deviceDataCollectionFinishedEventListener)
        submitGooglePayAuthRequest(paymentData)
      }
    }
  }

  const DDC_TIMEOUT_IN_MILLISECONDS = 30000

  const deviceDataCollectionTimeout = window.setTimeout(() => {
    window.removeEventListener('message', deviceDataCollectionFinishedEventListener)
    Charge.googlePayWorldpay3dsFlexDeviceDataCollectionStatus = `DDC timeout after ${DDC_TIMEOUT_IN_MILLISECONDS} milliseconds`
    submitGooglePayAuthRequest(paymentData)
  }, DDC_TIMEOUT_IN_MILLISECONDS)

  const iframe = document.getElementById('googlePayWorldpay3dsFlexDdcIframe')
  const iframeWindow = iframe.contentWindow
  const iframeDocument = iframeWindow.document

  window.addEventListener('message', deviceDataCollectionFinishedEventListener)

  const initiateDeviceDataCollection = iframeDocument => {
    const innerForm = iframeDocument.getElementById('collectionForm')
    innerForm.action = Charge.worldpay_3ds_flex_ddc_url
    iframeDocument.getElementById('input-jwt').value = Charge.worldpay_3ds_flex_ddc_jwt
    innerForm.submit()
  }

  if (iframeDocument.readyState === 'complete') {
    initiateDeviceDataCollection(iframeDocument)
  } else {
    iframeDocument.addEventListener('readystatechange', function () {
      if (iframeDocument.readyState === 'complete') {
        initiateDeviceDataCollection(iframeDocument)
      }
    }, false)
  }
}

const processPayment = paymentData => {
  toggleSubmitButtons()
  showSpinnerAndHideMainContent()

  if (typeof Charge.worldpay_3ds_flex_ddc_jwt !== 'string' || Charge.worldpay_3ds_flex_ddc_jwt === '') {
    submitGooglePayAuthRequest(paymentData)
  }

  if (typeof Charge.googlePayWorldpay3dsFlexDeviceDataCollectionStatus === 'string') {
    submitGooglePayAuthRequest(paymentData)
  } else {
    performDeviceDataCollectionForGooglePay(paymentData)
  }
}

const createGooglePaymentRequest = () => {
  const methodData = [{
    supportedMethods: 'https://google.com/pay',
    data: getGooglePaymentsConfiguration()
  }]

  const details = {
    total: {
      label: window.paymentDetails.description,
      amount: {
        currency: 'GBP',
        value: window.paymentDetails.amount
      }
    }
  }

  const options = {
    requestPayerEmail: email_collection_mode !== 'OFF', // eslint-disable-line camelcase
    requestPayerName: true
  }

  return new PaymentRequest(methodData, details, options)
}

const googlePayNow = () => {
  createGooglePaymentRequest()
    .show()
    .then(response => {
      response.complete('success')
      processPayment(response)
    })
    .catch(dismissed => {
      ga('send', 'event', 'Google Pay', 'Aborted', 'by user')
    })
}

module.exports = {
  createGooglePaymentRequest,
  googlePayNow
}
