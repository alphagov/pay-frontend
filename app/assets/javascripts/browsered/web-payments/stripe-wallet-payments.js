'use strict'

const { showErrorSummary, toggleWaiting } = require('./helpers')
const paymentMethodForms = Array.prototype.slice.call(document.getElementsByClassName('web-payments-container'))
let stripe

const createPaymentRequest = () => {
    window.paymentRequest = stripe.paymentRequest({
        country: 'GB',
        currency: 'gbp',
        total: {
            label: window.paymentDetails.description,
            amount: window.paymentDetails.amountInPence
        },
        requestPayerName: true,
        requestPayerEmail: true
    })
}

const setupEventListener = () => {
    paymentRequest.canMakePayment().then((result) => {
        if (result) {
            console.log('Wallet available')
            if (result.applePay) {
                document.body.classList.add('apple-pay-available')
                setupPaymentCompleteHandler('apple')
            }
            if (result.googlePay) {
                document.body.classList.add('google-pay-available')
                setupPaymentCompleteHandler('google')
            }
            paymentMethodForms.forEach(form => {
                form.addEventListener('submit', function (e) {
                    e.preventDefault()
                    paymentRequest.show()
                }, false)
            })
        } else {
            console.log('Wallet not available')
            document.getElementById('payment-request-button').style.display = 'none'
        }
    })
}

const setupPaymentCompleteHandler = (walletType) => {
    paymentRequest.on('paymentmethod', function (ev) {
        console.log('Stripe wallet payment submitted')
        const buttonId = walletType === 'google' ? 'google-pay-payment-method-submit': 'apple-pay-payment-method-submit'
        toggleWaiting(buttonId)

        return fetch(`/stripe-web-payments-auth-request/${window.paymentDetails.chargeID}`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'Accept-for-HTML': document.body.getAttribute('data-accept-header') || '*/*'
            },
            body: JSON.stringify({
                paymentMethodId: ev.paymentMethod.id
            })
        })
            .then(response => {
                console.log('Stripe wallet payment auth result received')
                if (response.status >= 200 && response.status < 300) {
                    return response.json().then(data => {
                        window.location.href = data.url
                    })
                }
            })
            .catch(err => {
                toggleWaiting(buttonId)
                showErrorSummary(i18n.fieldErrors.webPayments.failureTitle, i18n.fieldErrors.webPayments.failureBody)
                return err
            })
    })
}

const init = (stripePublishableKey, clientSecret) => {
    console.log('init stripe web payments called')
    stripe = Stripe(stripePublishableKey, {
        apiVersion: '2019-05-16'
    });
    createPaymentRequest()
    setupEventListener()
}

module.exports = {
    init
}