'use strict'

module.exports = () => {
  const payButton = document.getElementById('payment-request')
  const allowedCardTypes = window.Card

  if (window.PaymentRequest && payButton) {
    document.getElementById('payment-request').addEventListener('click', makePayment, false);

    if (window.ApplePaySession && ApplePaySession.canMakePayments()) {
      payButton.classList.remove('govuk-button')
      payButton.classList.add('apple-pay-button')
      payButton.innerHTML = `<span class="text">Buy with</span> <span class="logo">Apple Pay</span>`
    } else if (/Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)) {
      payButton.classList.remove('govuk-button')
      payButton.classList.add('google-pay-button')
      payButton.innerHTML = `<span class="text">Pay with</span> <span class="logo">Google Pay</span>`
    }

    payButton.parentNode.classList.remove('hidden')
  }

  function makePayment() {
    const supportedNetworks = allowedCardTypes.allowed.map(type => {
      if (type.debit || type.credit) {
        return type.brand
      }
    })

    let supportedTypes = []

    if (!allowedCardTypes.allowed.every(type => type.debit === false)) {
      supportedTypes.push('debit')
    }

    if (!allowedCardTypes.allowed.every(type => type.credit === false)) {
      supportedTypes.push('credit')
    }

    const supportedInstruments = [{
      supportedMethods: ['basic-card'],
      data: {
        supportedNetworks,
        supportedTypes
      }
    }];

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

    const request = new PaymentRequest(supportedInstruments, details, options);

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
            result.complete('success');
            return window.location.href = response.url
          } else {
            result.complete('fail');
            return window.location.href = response.url
          }
        }).catch(() => {
          result.complete('fail');
          return window.location.href = response.url
        });
      }).catch((err) => {
        return err
      });;
  }
}
