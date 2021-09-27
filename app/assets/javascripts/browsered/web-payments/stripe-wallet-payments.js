'use strict'

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

const setupPaymentCompleteHandler = (clientSecret) => {
    paymentRequest.on('paymentmethod', function (ev) {
        // Confirm the PaymentIntent without handling potential next actions (yet).
        stripe.confirmCardPayment(
            clientSecret,
            { payment_method: ev.paymentMethod.id },
            { handleActions: false }
        ).then(function (confirmResult) {
            if (confirmResult.error) {
                // Report to the browser that the payment failed, prompting it to
                // re-show the payment interface, or show an error message and close
                // the payment interface.
                ev.complete('fail');
            } else {
                // Report to the browser that the confirmation was successful, prompting
                // it to close the browser payment method collection interface.
                ev.complete('success');
                // Check if the PaymentIntent requires any actions and if so let Stripe.js
                // handle the flow. If using an API version older than "2019-02-11"
                // instead check for: `paymentIntent.status === "requires_source_action"`.
                if (confirmResult.paymentIntent.status === "requires_action") {
                    // Let Stripe.js handle the rest of the payment flow.
                    stripe.confirmCardPayment(clientSecret).then(function (result) {
                        if (result.error) {
                            // The payment failed -- ask your customer for a new payment method.
                        } else {
                            console.log('Wallet payment authorised')
                            // The payment has succeeded.
                            window.location.href = '/stripe-wallet-success'
                        }
                    });
                } else {
                    // The payment has succeeded.
                    console.log('Wallet payment authorised')
                    window.location.href = '/stripe-wallet-success'
                }
            }
        });
    });
}

const setupEventListener = () => {
    paymentRequest.canMakePayment().then((result) => {
        if (result) {
            console.log('Wallet available')
            if (result.applePay) {
                document.body.classList.add('apple-pay-available')
            }
            if (result.googlePay) {
                document.body.classList.add('google-pay-available')
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

const init = (stripePublishableKey, clientSecret) => {
    console.log('init stripe web payments called')
    stripe = Stripe(stripePublishableKey, {
        apiVersion: '2019-05-16'
    });
    createPaymentRequest()
    setupEventListener()
    setupPaymentCompleteHandler(clientSecret)
}

module.exports = {
    init
}