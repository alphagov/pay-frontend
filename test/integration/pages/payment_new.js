
var commands = {
};

module.exports = {
  url: 'http://localhost:9200',
  elements: {
   cardNo: { selector: "#card-no"},
   cardNoLabel: { selector: "#card-no-lbl span[data-label-replace]"},
   cvc: { selector: "#cvc"},
   expiryMonth: { selector: "input#expiry-month" },
   expiryYear: { selector: "input#expiry-year" },
   expiryLabel: { selector: ".expiry-date .form-label-bold" },
   "error-summary": { selector: "#error-summary"},
   "form": { selector: "form#card-details"}

  },
  commands: [commands],
};

