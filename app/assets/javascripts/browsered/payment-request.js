'use strict'

module.exports = () => {
  const allowedCardTypes = window.Card
  const paymentMethodForm = document.getElementById('payment-request-container')
  const standardMethodContainer = document.getElementById('enter-card-details-container')

  if (window.PaymentRequest && paymentMethodForm) {
    paymentMethodForm.classList.remove('hidden')
    standardMethodContainer.classList.add('hidden')

    if (window.ApplePaySession && ApplePaySession.canMakePayments()) {
      document.getElementById('payment-method-payment-request-apple').parentNode.style.display = 'block'
    } else if (/Chrome/.test(navigator.userAgent) && /Google Inc/.test) {
      document.getElementById('payment-method-payment-request').parentNode.style.display = 'block'
    }

    paymentMethodForm.addEventListener('submit', function(e) {
      e.preventDefault()
      const checkedValue = document.querySelectorAll('#payment-request-container input:checked')[0].value;
      if (checkedValue === 'standard') {
        standardMethodContainer.classList.remove('hidden')
        paymentMethodForm.classList.add('hidden')
      } else {
        makePayment()
      }
    }, false)
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
