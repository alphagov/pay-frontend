'use strict'

module.exports = () => {
  const allowedCardTypes = window.Card
  const paymentMethodForm = document.getElementById('payment-request-container')
  const standardMethodContainer = document.getElementById('enter-card-details-container')

  function prepareRequestObject(type) {
    const supportedNetworks = allowedCardTypes.allowed.map(type => {
      if (type.debit || type.credit) {
        return type.brand
      }
    })

    let supportedTypes = []
    let merchantCapabilities = []
    if (!allowedCardTypes.allowed.every(type => type.debit === false)) {
      supportedTypes.push('debit')
      merchantCapabilities.push('supportsDebit')
    }

    if (!allowedCardTypes.allowed.every(type => type.credit === false)) {
      supportedTypes.push('credit')
      merchantCapabilities.push('supportsCredit')
    }

    const supportedInstruments = [{
      supportedMethods: ['basic-card'],
      data: {
        supportedNetworks,
        supportedTypes
      }
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
      requestPayerEmail: true
    }

    if (type === 'apple') {
      const supportedNetworksAppleFormatted = supportedNetworks.map(brand => {
        if (brand === 'master-card') return 'masterCard'
        if (brand === 'american-express') return 'amex'
        return brand
      }).filter(brand => brand !== 'diners-club')
        .filter(brand => brand !== 'unionpay')

      if (merchantCapabilities.length < 2) {
        merchantCapabilities.push('supports3DS')
      } else {
        merchantCapabilities = ['supports3DS']
      }

      return {
        countryCode: 'GB',
        currencyCode: details.total.amount.currency,
        total: {
          label: details.total.label,
          amount: details.total.amount.value,
        },
        supportedNetworks: supportedNetworksAppleFormatted,
        merchantCapabilities,
        requiredShippingContactFields: ['email'],
      }
    } else {
      return {
        supportedInstruments,
        details,
        options
      }
    }
  }

  if (window.PaymentRequest && paymentMethodForm) {
    paymentMethodForm.classList.remove('hidden')
    standardMethodContainer.classList.add('hidden')

    if (window.ApplePaySession && ApplePaySession.canMakePayments()) {
      document.getElementById('payment-method-payment-request-apple').parentNode.style.display = 'block'
    } else if (/Chrome/.test(navigator.userAgent) && /Google Inc/.test) {
      document.getElementById('payment-method-payment-request').parentNode.style.display = 'block'
    }

    document.getElementById('payment-request-container').addEventListener('submit', function(e) {
      e.preventDefault()
      const checkedValue = document.querySelectorAll('#payment-request-container input:checked')[0].value
      if (checkedValue === 'standard') {
        standardMethodContainer.classList.remove('hidden')
        paymentMethodForm.classList.add('hidden')
      } else if (checkedValue === 'payment-request') {
        makePaymentRequest()
      } else if (checkedValue === 'payment-request-apple') {
        makeApplePayRequest()
      }
    }, false)
  }

  function getApplePaySession(url) {
    return fetch(`/apple-pay-merchant-validation`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url })
    }).then(response => {
      if (response.status >= 200 && response.status < 300) {
        return response.json().then(data => {
          return data
        })
      } else {
        return session.abort();
      }
    })
  }

  function makeApplePayRequest() {
    const session = new ApplePaySession(3, prepareRequestObject('apple'))

    session.onvalidatemerchant = event => {
      const validationURL = event.validationURL
      getApplePaySession(event.validationURL).then(response => {
        session.completeMerchantValidation(response)
      }).catch(err => {
        console.log('Couldn’t contact Apple Pay server', err)
        // return err
        return fetch(`/make-payment/${window.paymentDetails.chargeID}`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            payload: "bla"
          })
        })
      })
    }

    session.onpaymentauthorized = event => {
      // Send payment for processing...
      const payment = event.payment;
      console.log('authorisation complete', payment)

      // ...return a status and redirect to a confirmation page
      session.completePayment(ApplePaySession.STATUS_SUCCESS);
      // window.location.href = "/success.html";
    }

    session.begin()
  }

  function makePaymentRequest() {
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
}
