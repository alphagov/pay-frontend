(function () {
  'use strict'
  var root = this
  if (typeof root.GOVUK === 'undefined') { root.GOVUK = {} }

  // Stop users double submitting payment charge as causes errors on slow connections
  var disableAfterSubmit = {
    init: function () {
      var $button = $('[data-module="stop-double-submit"]')
      if ($button.length) {
        disableAfterSubmit.watch($button)
      }
    },
    watch: function (element) {
      var $form = element.parents('form')
      $form.submit(function (e) {
        element.attr('disabled', 'disabled')
      })
    }
  }
  root.GOVUK.stopDoubleSubmit = disableAfterSubmit
}).call(this)
