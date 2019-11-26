'use strict'

const chargeValidation = require('../../../utils/charge_validation')
const { submitWithWorldpay3dsFlexDdcResult } = require('./worldpay-3ds-flex-ddc')

var init = function () {
  var form = document.getElementById('card-details')
  var formInputs = Array.prototype.slice.call(form.querySelectorAll('input'))
  var countrySelect = document.getElementById('address-country')
  var postcodeInput = document.getElementById('address-postcode')
  var cardInput = document.getElementById('card-no')
  var corporateCardMessageElement = document.getElementById('corporate-card-surcharge-message')
  var paymentSummaryAmountValue = document.getElementById('amount').getAttribute('data-amount')
  var paymentSummaryBreakdownElement = document.getElementById('payment-summary-breakdown')
  var paymentSummaryBreakdownAmountElement = document.getElementById('payment-summary-breakdown-amount')
  var paymentSummaryCorporateCardFeeElement = document.getElementById('payment-summary-corporate-card-fee')
  var paymentSummaryAmountElement = document.getElementById('amount')
  var errorSummary = document.getElementsByClassName('govuk-error-summary')[0]
  var logger = { info: function () { } }// replace with console to see output
  // window.card comes from the view

  const chargeValidations = chargeValidation(
    i18n.fieldErrors,
    logger,
    window.Card,
    window.Charge
  )
  var required = chargeValidations.required

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
  if (window.Charge.collect_billing_address === true) {
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

    // can't get the element in init() as the object wouldn't have been initalised by helpers.js -> initialiseAddressCountryAutocomplete
    var countryAutocomplete = document.getElementsByClassName('autocomplete__input')[0]

    if ((window.Charge.collect_billing_address === true) && (countryAutocomplete.value === '')) {
      countryAutocomplete.value = document.getElementById('address-country-select').value
    }

    if (!validations.hasError) {
      document.getElementById('submit-card-details').setAttribute('disabled', 'disabled')
      if (typeof Charge.worldpay_3ds_flex_ddc_jwt === 'string' && Charge.worldpay_3ds_flex_ddc_jwt !== '') {
        submitWithWorldpay3dsFlexDdcResult(e.target)
      } else {
        form.submit()
      }
    } else {
      addValidationsErrors()
    }
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
    var groupHasError = group ? group.classList.contains('govuk-form-group--error') : false
    var lastOfgroup = input.hasAttribute('data-last-of-form-group')
    var required = input.hasAttribute('data-required')
    if ((lastOfgroup && required) || groupHasError) { return checkValidation(input) }
    if (inGroup || blank) return
    checkValidation(input)
  }

  var checkValidation = function (input) {
    var formGroup = getFormGroup(input)

    var validationName = getFormGroupValidation(formGroup)

    var validation = validationFor(validationName)

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
    clearCorporateCardSurchargeInformation()
    showCardType().checkCardtypeIsAllowed().then(
      function (result) {
        updateCorporateCardSurchargeInformation(result)
        if (result.accepted === false) {
          addCardError(result)
        }
      })
    replaceOnError(validation, formGroup)
  }

  var updateCorporateCardSurchargeInformation = function (card) {
    if (window.Card && window.Card.corporate_card_surcharge_amounts && card.corporate) {
      if (card.type === 'CREDIT' && card.prepaid === 'NOT_PREPAID' && window.Card.corporate_card_surcharge_amounts.credit > 0) {
        showCorporateCardSurchargeInformation(card.type, window.Card.corporate_card_surcharge_amounts.credit)
      } else if (card.type === 'DEBIT' && card.prepaid === 'NOT_PREPAID' && window.Card.corporate_card_surcharge_amounts.debit > 0) {
        showCorporateCardSurchargeInformation(card.type, window.Card.corporate_card_surcharge_amounts.debit)
      } else if (card.type === 'CREDIT' && card.prepaid === 'PREPAID' && window.Card.corporate_card_surcharge_amounts.prepaidCredit > 0) {
        showCorporateCardSurchargeInformation(card.type, window.Card.corporate_card_surcharge_amounts.prepaidCredit)
      } else if (card.type === 'DEBIT' && card.prepaid === 'PREPAID' && window.Card.corporate_card_surcharge_amounts.prepaidDebit > 0) {
        showCorporateCardSurchargeInformation(card.type, window.Card.corporate_card_surcharge_amounts.prepaidDebit)
      }
    }
  }

  var showCorporateCardSurchargeInformation = function (cardType, corporateCardSurchargeAmount) {
    var amountNumber = parseInt(paymentSummaryAmountValue)
    var corporateCardSurchargeAmountNumber = corporateCardSurchargeAmount / 100

    // card message
    var corporateCardSurchargeMessage = cardType === 'CREDIT'
      ? i18n.cardDetails.corporateCreditCardSurchargeMessage : i18n.cardDetails.corporateDebitCardSurchargeMessage
    corporateCardMessageElement.textContent = corporateCardSurchargeMessage.replace('%s', corporateCardSurchargeAmountNumber.toFixed(2))
    corporateCardMessageElement.classList.remove('hidden')
    // payment summary
    paymentSummaryBreakdownAmountElement.textContent = '£' + amountNumber.toFixed(2)
    paymentSummaryCorporateCardFeeElement.textContent = '£' + corporateCardSurchargeAmountNumber.toFixed(2)
    paymentSummaryAmountElement.textContent = '£' + (amountNumber + corporateCardSurchargeAmountNumber).toFixed(2)
    paymentSummaryBreakdownElement.classList.remove('hidden')
  }

  var clearCorporateCardSurchargeInformation = function () {
    // card message
    corporateCardMessageElement.classList.add('hidden')
    corporateCardMessageElement.textContent = ''
    // payment summary
    paymentSummaryBreakdownElement.classList.add('hidden')
    paymentSummaryBreakdownAmountElement.textContent = ''
    paymentSummaryCorporateCardFeeElement.textContent = ''
    paymentSummaryAmountElement.textContent = '£' + paymentSummaryAmountValue
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
    var validation = allValidations().errorFields.filter(function (validation) {
      return validation.key === name
    })
    if (!validation[0]) return
    return validation[0].value
  }

  var allFields = function () {
    var fields = {}
    required.forEach(function (requiredField) {
      var getField = findInputByKey(requiredField)
      if (getField) {
        fields[requiredField] = getField
      }
    })
    return fields
  }

  var allFieldValues = function () {
    var values = {}
    required.forEach(function (requiredField) {
      var getField = findInputByKey(requiredField)
      if (getField) {
        values[requiredField] = getField.value.trim()
      }
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
    var foundInput = document.querySelectorAll('input[name=' + key + '], select[name=' + key + ']')
    // Only return inputs that exist on the form
    return foundInput ? foundInput[0] : null
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
          var matches = (this.document || this.ownerDocument).querySelectorAll(s)

          var i = matches.length
          while (--i >= 0 && matches.item(i) !== this) { }
          return i > -1
        }
    }

    // Get the closest matching element
    for (; elem && elem !== document; elem = elem.parentNode) {
      if (elem.matches(selector)) return elem
    }
    return null
  }
}

module.exports = {
  init
}
