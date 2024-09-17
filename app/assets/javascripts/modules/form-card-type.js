var showCardType = function() {
  var form = document.getElementById('card-details')
  var acceptedCards = form.querySelector('.accepted-cards')
  var cardInput = form.querySelector('#card-no')
  var cards = Array.prototype.slice.call(acceptedCards.querySelectorAll('li'))
  var cardNoLabel = form.querySelector('.card-no-label')
  var cardNoFormGroup = form.querySelector('.card-no-group')
  var notSupportedString = i18n.fieldErrors.fields.cardNo.cardNotSupported
  var nonNumberString = i18n.fieldErrors.fields.cardNo.nonNumeric
  // window.card comes from the view
  var validations = module.chargeValidation(i18n.fieldErrors,console, window.Card)
  var cardValidation = validations.creditCardType
  var cardTypes = validations.allowedCards
  var cvcInput = form.querySelector('#cvc')
  var amexCvcTip = form.querySelector('.amex-cvc')
  var genericCvcTip = form.querySelector('.generic-cvc')

  var init = function() {
    cardInput.addEventListener('blur', unselectIfNotAvailable, false)
    cardInput.addEventListener('keyup', showCardType, false)
    cvcInput.addEventListener('input', cvcTrim(cvcInput), false)
  }

  var unselectIfNotAvailable = function() {
    if (cardIsInvalid()) unSelectAll();
  }

  var cardIsInvalid = function() {
    return validations.cardNo(cardInput.value) !== true;
  }

  var showCardType = function() {
    var cardType  = getCardType();
    var number = cardInput.value.replace(/\D/g,'');
    unSelectAll();
    checkEmpty();
    checkAllowed(cardType);
    checkNumeric(cardInput.value, number);
    cvcHighlight(); // to reset
    cvcLength();
    if (cardType.length !== 1) return;
    cvcHighlight(cardType[0].type);
    selectCard(cardType[0].type);
    cvcLength(cardType[0].type);
  }

  var getCardType = function() {
    var number = cardInput.value.replace(/\D/g,'');
    return cardValidation(number);
  }

  var unSelectAll = function() {
    cards.forEach(function(card) {
      card.classList.remove('selected');
    })
  }

  var selectCard = function(name) {
    cards.forEach(function(card) {
      if (card.classList.contains(name)) {
        card.classList.add('selected')
      }
    })
  }

  var checkEmpty = function() {
    if (cardInput.value.length === 0) {
      acceptedCards.classList.add('field-empty');
    } else {
      acceptedCards.classList.remove('field-empty');
    }
  }

  var checkAllowed = function(cardType) {
    if (cardType.length !== 1) return replaceCardLabelWithOriginal();
    var supported = false;
    for (var i = 0; i < cardTypes.length; i++) {
      if (supported) continue;
      if (cardTypes[i].brand == cardType[0].type) supported = true;
    }

    if (supported) return replaceCardLabelWithOriginal();
    addErrorToCard(notSupportedString);
  }

  var checkNumeric = function(fullNumber, strippedNumber) {
    if (fullNumber.length - strippedNumber.length > 2 && strippedNumber.length < 4) {
      addErrorToCard(nonNumberString,true);
    }
  }

  var addErrorToCard = function(str, force) {
    if (cardIsInvalid() && !force) return;
    cardNoFormGroup.classList.add('error');
    cardNoLabel.textContent = str;
  }

  var replaceCardLabelWithOriginal = function() {
    if (cardIsInvalid()) return;
    cardNoFormGroup.classList.remove('error');
    cardNoLabel.textContent = cardNoLabel.getAttribute('data-original-label');
  }

  var cvcHighlight = function(type) {
    var isAmex = type === 'american-express';
    if (isAmex) {
      amexCvcTip.classList.remove('hidden');
      genericCvcTip.classList.add('hidden');
    } else {
      amexCvcTip.classList.add('hidden');
      genericCvcTip.classList.remove('hidden');
    }
  }

  var cvcLength = function(type) {
    var isAmex = type === 'american-express';
    if (isAmex) {
      cvcInput.setAttribute('maxlength', 4)
    } else {
      cvcInput.setAttribute('maxlength', 3)
    }
  }

  var cvcTrim = function(input) {
    if (input.value.length > input.maxLength) {
      input.value = input.value.slice(0, input.maxLength);
    }
  }

  var getSupportedChargeType = function(name) {
    var card = cards.querySelectorAll('.' + name)[0];
    return {
      debit: card.getAttribute('data-debit'),
      credit: card.getAttribute('data-credit')
    };
  }

  var checkCardtypeIsAllowed = function () {
    return new Promise(function (resolve, reject) {
      var request = new XMLHttpRequest();
      var card = getCardType();
      if (card.length !== 1 && cardInput.value.replace(/\D/g,'').length < 11) return
      request.open('POST', '/check_card/' + chargeId, true);
      request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
      request.onload = function () {
        var payload = JSON.parse(request.response)
        if (request.status >= 200 && request.status < 400) {
          return resolve(payload)
        } else {
          return reject()
        }
      }
      request.onerror = function () {
        return reject()
      }
      request.send('cardNo=' + encodeURIComponent(
        cardInput.value.replace(/\D/g, '')
      ))
    });
  }

  return {
    init: init,
    checkCardtypeIsAllowed: checkCardtypeIsAllowed
  };
};
