
var commands = {
  generateCharge: function(params) {

    return this.navigate()
      .setValue("@tokenInput", params.token)
      .submitForm("@tokenForm")
      .assert.title("Proceed to payment")
      .setValue("@paymentDescription", params.description)
      .setValue("@paymentReference", params.reference)
      .setValue("@paymentAmount", params.amount)
      .submitForm("@paymentForm")
      .assert.title("Enter your card details.");
  }
};

module.exports = {
  url: 'http://localhost:9000',
  elements: {
    tokenInput: { selector: "#auth-token" },
    tokenForm: { selector:".payment-summary form" },
    paymentForm: { selector:'.payment-summary form[action="/pay"]' },
    paymentDescription: { selector:'.payment-summary form[action="/pay"] input#description' },
    paymentReference: { selector:'.payment-summary form[action="/pay"] input#reference' },
    paymentAmount: { selector:'.payment-summary form[action="/pay"] input#amount' }
  },
  commands: [commands],
};

