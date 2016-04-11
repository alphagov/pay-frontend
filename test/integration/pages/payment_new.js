
var commands = {
  EnterValidDetails: function(){
    return this
      .setValue("@cardNo", "4242424242424242")
      .setValue("@cardName", "a name")
      .setValue("@cvc", "123")
      .setValue("@expiryMonth", "10")
      .setValue("@expiryYear", "18")
      .setValue("@addressLine1", "its an address")
      .setValue("@addressCity", "its a city")
      .setValue("@addressPostcode", "n4 1bq");
  }
};

module.exports = {
  url: 'http://localhost:9200',
  elements: {
   cardName: "#cardholder-name",
   cardNo: "#card-no",
   cardNoLabel: "#card-no-lbl span[data-label-replace]",
   cvc: "#cvc",
   cvcLabel: ".cvc-label",
   expiryMonth: "input#expiry-month" ,
   expiryYear: "input#expiry-year" ,
   expiryLabel: ".expiry-date-label" ,
   addressLine1: "#address-line-1",
   addressCity: "#address-city",
   addressPostcode: "#address-postcode",
   addressPostcodeLabel: ".address-postcode-label",
   "error-summary": "#error-summary",
   "form": "form#card-details"

  },
  commands: [commands],
};

