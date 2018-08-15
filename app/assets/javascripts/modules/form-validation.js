'use strict'

var formValidation = function () {
  var form = document.getElementById('card-details')
  var formInputs = form.querySelectorAll('input')
  var countryAutocomplete = document.getElementsByClassName('autocomplete__input')[0]
  var countrySelect = document.getElementById('address-country')
  var postcodeInput = document.getElementById('address-postcode')
  var cardInput = document.getElementById('card-no')
  var errorSummary = document.getElementsByClassName('govuk-error-summary')[0]
  var logger = { info: function () { } }// replace with console to see output
  // window.card comes from the view
  var chargeValidations = module.chargeValidation(
    i18n.chargeController.fieldErrors,
    logger,
    window.Card
  )
  var required = chargeValidations.required

  var init = function () {
    form.addEventListener('submit', function (e) {
      checkFormSubmission(e)
    }, false)
    if (formInputs) {
      formInputs.forEach(function (input) {
        input.addEventListener('blur', function (e) {
          checkPreviousFocused(input)
        }, false)
      })
    }
    countrySelect.addEventListener('change', function () {
      checkValidation(postcodeInput)
    }, false)
  }

  var checkFormSubmission = function (e) {
    // ZAP tests need to be able to post bad form fields to be able to try all the pen test stuff so this allows us to do that
    var zapDisabler = document.getElementById('disable-for-zap')
    if (zapDisabler !== null) {
      return
    }
    e.preventDefault()
    var validations = allValidations()
    if (countryAutocomplete.value === '') {
      countryAutocomplete.value = document.getElementById('address-country-select').value
    }

    if (!validations.hasError) {
      document.getElementById('submit-card-details').setAttribute('disabled', 'disabled')
      return form.submit()
    }
    addValidationsErrors()
  }

  var addValidationsErrors = function () {
    addAllValidations()
    generateHighlightBlock()
  }

  var addCardError = function (error) {
    var formGroup = getFormGroup(cardInput)
    replaceLabel(error.message, formGroup)
    prependHighlightError({ cssKey: 'card-no', value: error.message })
    formGroup.classList.add('govuk-form-group--error')
  }

  var addAllValidations = function () {
    var fields = allFields()
    for (var field in fields) {
      checkValidation(fields[field])
    }
  }

  var generateHighlightBlock = function () {
    errorSummary.classList.remove('hidden')
    errorSummary.setAttribute('aria-hidden', 'false')
    document.getElementsByClassName('govuk-error-summary__list')[0].innerHTML = ''
    appendHighlightErrors()

    location.hash = ''
    setTimeout(function () {
      location.hash = '#error-summary'
    }, 10)
  }

  var appendHighlightErrors = function () {
    var errors = allValidations().errorFields
    for (var key in errors) {
      var error = errors[key]
      appendHighlightError(error)
    }
  }

  var appendHighlightError = function (error) {
    addHighlightError('append', error)
  }

  var prependHighlightError = function (error) {
    addHighlightError('prepend', error)
  }

  var addHighlightError = function (addType, error) {
    var listElement = document.createElement('li')
    var errorAnchor = document.createElement('a')
    errorAnchor.setAttribute('href', '#' + error.cssKey + '-lbl')
    errorAnchor.id = error.cssKey + '-error'
    errorAnchor.innerText = error.value
    listElement.appendChild(errorAnchor)

    if (addType === 'append') {
      document.getElementsByClassName('govuk-error-summary__list')[0].appendChild(listElement)
    } else {
      document.getElementsByClassName('govuk-error-summary__list')[0].insertBefore(listElement, parent.firstChild)
    }
  }

  var checkPreviousFocused = function (input) {
    setTimeout(function () {
      // document.activelement is set to body unless you do this
      checkValidationInline(input)
    }, 50)
  }

  var checkValidationInline = function (input) {
    var blank = input.value.length === 0
    var group = getFormGroup(input)
    // validation happens on blur, check which input the user is on now
    var focusedGroup = getFormGroup(document.activeElement)
    var inGroup = focusedGroup === group
    var groupHasError = getFormGroup(input).classList.contains('govuk-form-group--error')
    var lastOfgroup = input.hasAttribute('data-last-of-form-group')
    var required = input.hasAttribute('data-required')
    if ((lastOfgroup && required) || groupHasError) { return checkValidation(input) }
    if (inGroup || blank) return
    checkValidation(input)
  }

  var checkValidation = function (input) {
    var formGroup = getFormGroup(input),
      validationName = getFormGroupValidation(formGroup),
      validation = validationFor(validationName)

    if (validation) {
      input.classList.add('govuk-input--error')
    } else {
      input.classList.remove('govuk-input--error')
    }

    if (input === cardInput) {
      checkCardType(validation, formGroup)
      return
    }

    replaceOnError(validation, formGroup)
  }

  var checkCardType = function (validation, formGroup) {
    showCardType().checkCardtypeIsAllowed().then(
      function (result) {
        if (result.accepted === false) {
          addCardError(result)
        }
      })
    replaceOnError(validation, formGroup)
  }

  var replaceOnError = function (validation, formGroup) {
    var validated = validation === undefined
    replaceLabel(validation, formGroup)
    if (!validated) {
      formGroup.classList.add('govuk-form-group--error')
    } else {
      formGroup.classList.remove('govuk-form-group--error')
    }
  }

  var replaceLabel = function (validation, formGroup) {
    var label = formGroup.querySelectorAll('[data-label-replace]')[0]
    if (label.length === 0) return
    if (validation) {
      label.textContent = validation
      label.setAttribute('role', 'alert')
      label.classList.add('govuk-error-message')
    } else {
      label.textContent = label.getAttribute('data-original-label')
      label.setAttribute('role', '')
      label.classList.remove('govuk-error-message')
    }
  }

  var validationFor = function (name) {
    var validation = allValidations().errorFields.filter(function(validation) {
      return validation.key === name
    })
    if (!validation[0]) return
    return validation[0].value
  }

  var allFields = function () {
    var fields = {}
    required.forEach(function (requiredField) {
      fields[requiredField] = findInputByKey(requiredField)
    })
    return fields
  }

  var allFieldValues = function () {
    var values = {}
    required.forEach(function (requiredField) {
      values[requiredField] = findInputByKey(requiredField).value.trim()
    })
    return values
  }

  var allValidations = function () {
    return chargeValidations.verify(allFieldValues())
  }

  var getFormGroup = function (input) {
    return getClosest(input, '.govuk-form-group')
  }

  var getFormGroupValidation = function (formGroup) {
    return formGroup.getAttribute('data-validation')
  }

  var findInputByKey = function (key) {
    return document.querySelectorAll('input[name=' + key + '], select[name=' + key + ']')[0]
  }

  var getClosest = function (elem, selector) {
    // Element.matches() polyfill
    if (!Element.prototype.matches) {
      Element.prototype.matches =
        Element.prototype.matchesSelector ||
        Element.prototype.mozMatchesSelector ||
        Element.prototype.msMatchesSelector ||
        Element.prototype.oMatchesSelector ||
        Element.prototype.webkitMatchesSelector ||
        function (s) {
          var matches = (this.document || this.ownerDocument).querySelectorAll(s),
            i = matches.length;
          while (--i >= 0 && matches.item(i) !== this) { }
          return i > -1;
        };
    }

    // Get the closest matching element
    for (; elem && elem !== document; elem = elem.parentNode) {
      if (elem.matches(selector)) return elem;
    }
    return null;
  };

  init()
}
