'use strict'

const chargeValidation = require('../../../utils/charge-validation')
const { submitWithWorldpay3dsFlexDdcResult } = require('./worldpay-3ds-flex-ddc')

const init = function () {
  const form = document.getElementById('card-details')
  const formInputs = Array.prototype.slice.call(form.querySelectorAll('input'))
  const countrySelect = document.getElementById('address-country')
  const postcodeInput = document.getElementById('address-postcode')
  const cardInput = document.getElementById('card-no')
  const corporateCardMessageElement = document.getElementById('corporate-card-surcharge-message')
  const paymentSummaryAmountValue = document.getElementById('amount').getAttribute('data-amount')
  const paymentSummaryBreakdownElement = document.getElementById('payment-summary-breakdown')
  const paymentSummaryBreakdownAmountElement = document.getElementById('payment-summary-breakdown-amount')
  const paymentSummaryCorporateCardFeeElement = document.getElementById('payment-summary-corporate-card-fee')
  const paymentSummaryAmountElement = document.getElementById('amount')
  const errorSummary = document.getElementsByClassName('govuk-error-summary')[0]
  const logger = { info: function () { } }// replace with console to see output
  // window.card comes from the view

  const chargeValidations = chargeValidation(
    i18n.fieldErrors,
    logger,
    window.Card,
    window.Charge
  )
  const required = chargeValidations.required

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

  const checkFormSubmission = function (e) {
    // ZAP tests need to be able to post bad form fields to be able to try all the pen test stuff so this allows us to do that
    const zapDisabler = document.getElementById('disable-for-zap')
    if (zapDisabler !== null) {
      return
    }
    e.preventDefault()
    const validations = allValidations()

    // can't get the element in init() as the object wouldn't have been initalised by helpers.js -> initialiseAddressCountryAutocomplete
    const countryAutocomplete = document.getElementsByClassName('autocomplete__input')[0]

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

  const addValidationsErrors = function () {
    addAllValidations()
    generateHighlightBlock()
  }

  const addCardError = function (error) {
    const formGroup = getFormGroup(cardInput)
    replaceLabel(error.message, formGroup)
    prependHighlightError({ cssKey: 'card-no', value: error.message })
    formGroup.classList.add('govuk-form-group--error')
  }

  const addAllValidations = function () {
    const fields = allFields()
    for (const field in fields) {
      checkValidation(fields[field])
    }
  }

  const generateHighlightBlock = function () {
    errorSummary.classList.remove('hidden')
    errorSummary.setAttribute('aria-hidden', 'false')
    document.getElementsByClassName('govuk-error-summary__list')[0].innerHTML = ''
    appendHighlightErrors()

    location.hash = ''
    setTimeout(function () {
      location.hash = '#error-summary'
    }, 10)
  }

  const appendHighlightErrors = function () {
    const errors = allValidations().errorFields
    for (const key in errors) {
      const error = errors[key]
      appendHighlightError(error)
    }
  }

  const appendHighlightError = function (error) {
    addHighlightError('append', error)
  }

  const prependHighlightError = function (error) {
    addHighlightError('prepend', error)
  }

  const addHighlightError = function (addType, error) {
    const listElement = document.createElement('li')
    const errorAnchor = document.createElement('a')
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

  const checkPreviousFocused = function (input) {
    setTimeout(function () {
      // document.activelement is set to body unless you do this
      checkValidationInline(input)
    }, 50)
  }

  const checkValidationInline = function (input) {
    const blank = input.value.length === 0
    const group = getFormGroup(input)
    // validation happens on blur, check which input the user is on now
    const focusedGroup = getFormGroup(document.activeElement)
    const inGroup = focusedGroup === group
    const groupHasError = group ? group.classList.contains('govuk-form-group--error') : false
    if (groupHasError) { return checkValidation(input) }
    if (inGroup || blank) return
    checkValidation(input)
  }

  const checkValidation = function (input) {
    const formGroup = getFormGroup(input)

    const validationName = getFormGroupValidation(formGroup)

    const validation = validationFor(validationName)

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

  const checkCardType = function (validation, formGroup) {
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

  const updateCorporateCardSurchargeInformation = function (card) {
    if (window.Card && window.Card.corporate_card_surcharge_amounts && card.corporate) {
      if (card.type === 'CREDIT' && card.prepaid === 'NOT_PREPAID' && window.Card.corporate_card_surcharge_amounts.credit > 0) {
        showCorporateCardSurchargeInformation(card.type, window.Card.corporate_card_surcharge_amounts.credit)
      } else if (card.type === 'DEBIT' && card.prepaid === 'NOT_PREPAID' && window.Card.corporate_card_surcharge_amounts.debit > 0) {
        showCorporateCardSurchargeInformation(card.type, window.Card.corporate_card_surcharge_amounts.debit)
      } else if (card.type === 'DEBIT' && card.prepaid === 'PREPAID' && window.Card.corporate_card_surcharge_amounts.prepaidDebit > 0) {
        showCorporateCardSurchargeInformation(card.type, window.Card.corporate_card_surcharge_amounts.prepaidDebit)
      }
    }
  }

  const showCorporateCardSurchargeInformation = function (cardType, corporateCardSurchargeAmount) {
    const amountNumber = parseFloat(paymentSummaryAmountValue)
    const corporateCardSurchargeAmountNumber = corporateCardSurchargeAmount / 100

    // card message
    const corporateCardSurchargeMessage = cardType === 'CREDIT'
      ? i18n.cardDetails.corporateCreditCardSurchargeMessage
      : i18n.cardDetails.corporateDebitCardSurchargeMessage
    corporateCardMessageElement.textContent = corporateCardSurchargeMessage.replace('%s', corporateCardSurchargeAmountNumber.toFixed(2))
    corporateCardMessageElement.classList.remove('hidden')
    // payment summary
    paymentSummaryBreakdownAmountElement.textContent = '£' + amountNumber.toFixed(2)
    paymentSummaryCorporateCardFeeElement.textContent = '£' + corporateCardSurchargeAmountNumber.toFixed(2)
    paymentSummaryAmountElement.textContent = '£' + (amountNumber + corporateCardSurchargeAmountNumber).toFixed(2)
    paymentSummaryBreakdownElement.classList.remove('hidden')
  }

  const clearCorporateCardSurchargeInformation = function () {
    // card message
    corporateCardMessageElement.classList.add('hidden')
    corporateCardMessageElement.textContent = ''
    // payment summary
    paymentSummaryBreakdownElement.classList.add('hidden')
    paymentSummaryBreakdownAmountElement.textContent = ''
    paymentSummaryCorporateCardFeeElement.textContent = ''
    paymentSummaryAmountElement.textContent = '£' + paymentSummaryAmountValue
  }

  const replaceOnError = function (validation, formGroup) {
    const validated = validation === undefined
    replaceLabel(validation, formGroup)
    if (!validated) {
      formGroup.classList.add('govuk-form-group--error')
    } else {
      formGroup.classList.remove('govuk-form-group--error')
    }
  }

  const replaceLabel = function (validation, formGroup) {
    const label = formGroup.querySelectorAll('[data-label-replace]')[0]
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

  const validationFor = function (name) {
    const validation = allValidations().errorFields.filter(function (validation) {
      return validation.key === name
    })
    if (!validation[0]) return
    return validation[0].value
  }

  const allFields = function () {
    const fields = {}
    required.forEach(function (requiredField) {
      const getField = findInputByKey(requiredField)
      if (getField) {
        fields[requiredField] = getField
      }
    })
    return fields
  }

  const allFieldValues = function () {
    const values = {}
    required.forEach(function (requiredField) {
      const getField = findInputByKey(requiredField)
      if (getField) {
        values[requiredField] = getField.value.trim()
      }
    })
    return values
  }

  const allValidations = function () {
    return chargeValidations.verify(allFieldValues())
  }

  const getFormGroup = function (input) {
    return getClosest(input, '.govuk-form-group')
  }

  const getFormGroupValidation = function (formGroup) {
    return formGroup.getAttribute('data-validation')
  }

  const findInputByKey = function (key) {
    const foundInput = document.querySelectorAll('input[name=' + key + '], select[name=' + key + ']')
    // Only return inputs that exist on the form
    return foundInput ? foundInput[0] : null
  }

  const getClosest = function (elem, selector) {
    // Element.matches() polyfill
    if (!Element.prototype.matches) {
      Element.prototype.matches =
        Element.prototype.matchesSelector ||
        Element.prototype.mozMatchesSelector ||
        Element.prototype.msMatchesSelector ||
        Element.prototype.oMatchesSelector ||
        Element.prototype.webkitMatchesSelector ||
        function (s) {
          const matches = (this.document || this.ownerDocument).querySelectorAll(s)
          let i = matches.length
          while (--i >= 0 && matches.item(i) !== this) {
            /* empty */
          }
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
