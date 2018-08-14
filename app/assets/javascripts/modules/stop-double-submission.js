(function () {
  'use strict'
  var root = this
  if (typeof root.GOVUK === 'undefined') { root.GOVUK = {} }

  // Stop users double submitting payment charge as causes errors on slow connections
  var disableAfterSubmit = {
    init: function () {
      var button = Array.prototype.slice.call(document.querySelectorAll('[data-module="stop-double-submit"]'))
      if (button.length) {
        disableAfterSubmit.watch(button[0])
      }
    },
    watch: function (element) {
      element.form.addEventListener('submit', function () {
        element.setAttribute('disabled', 'disabled')
      }, false);
    }
  }
  root.GOVUK.stopDoubleSubmit = disableAfterSubmit
}).call(this)
