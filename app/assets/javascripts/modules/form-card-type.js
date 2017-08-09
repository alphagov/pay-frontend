var showCardType = function(){
  var form          = $('form#card-details'),
  acceptedCards     = form.find('.accepted-cards'),
  cardInput         = form.find('input#card-no'),
  cards             = form.find('.accepted-cards > li'),
  cardNoLabel       = form.find('.card-no-label'),
  cardNoFormGroup   = form.find('.card-no-group'),
  notSupportedString= i18n.chargeController.fieldErrors.fields.cardNo.card_not_supported,
  nonNumberString   = i18n.chargeController.fieldErrors.fields.cardNo.non_numeric,
  // window.card comes from the view
  validations       = module.chargeValidation(i18n.chargeController.fieldErrors,console,window.Card);
  var cardValidation    = validations.creditCardType,
  cardTypes         = validations.allowedCards,
  cvcInput          = form.find('#cvc'),
  amexCvcTip        = form.find('.amex-cvc'),
  genericCvcTip     = form.find('.generic-cvc');

  var init = function(){
    cardInput
      .on('blur',unselectIfNotAvailable)
      .on('keyup',showCardType);

    cvcInput
      .on('input', cvcTrim)
  },

  unselectIfNotAvailable = function(){
    if (cardIsInvalid()) unSelectAll();
  },

  cardIsInvalid = function(){
    return validations.cardNo(cardInput.val()) !== true;
  },

  showCardType = function(){
    var cardType  = getCardType();
    var number = cardInput.val().replace(/\D/g,'');
    unSelectAll();
    checkEmpty();
    checkAllowed(cardType);
    checkNumeric($(this).val(), number);
    cvcHighlight(); // to reset
    cvcLength();
    if (cardType.length !== 1) return;
    cvcHighlight(cardType[0].type);
    selectCard(cardType[0].type);
    cvcLength(cardType[0].type);
  },

  getCardType = function(){
    var number = cardInput.val().replace(/\D/g,'');
    return cardValidation(number);
  },

  unSelectAll = function(){
    cards.removeClass('selected');
  },

  selectCard = function(name){
    cards.filter('.' + name).addClass('selected');
  },

  checkEmpty = function(){
    acceptedCards.toggleClass('field-empty',cardInput.val().length === 0);
  },

  checkAllowed = function(cardType){
    if (cardType.length !== 1) return replaceCardLabelWithOriginal();
    var supported = false;
    for (var i = 0; i < cardTypes.length; i++) {
      if (supported) continue;
      if (cardTypes[i].brand == cardType[0].type) supported = true;
    }

    if (supported) return replaceCardLabelWithOriginal();
    addErrorToCard(notSupportedString);
  },

  checkNumeric = function(fullNumber,strippedNumber) {
    if (fullNumber.length - strippedNumber.length > 2 && strippedNumber.length < 4) {
      addErrorToCard(nonNumberString,true);
    }
  },

  addErrorToCard = function(str,force){
    if (cardIsInvalid() && !force) return;
    cardNoFormGroup.addClass('error');
    cardNoLabel.text(str);
  },

  replaceCardLabelWithOriginal = function(){
    if (cardIsInvalid()) return;
    cardNoFormGroup.removeClass('error');
    cardNoLabel.text(cardNoLabel.attr('data-original-label'));
  },

  cvcHighlight = function(type){
    var isAmex = type === 'american-express';
    amexCvcTip.toggleClass('hidden',!isAmex);
    genericCvcTip.toggleClass('hidden',isAmex);
  },

  cvcLength = function(type){
    var isAmex = type === 'american-express';
    if (isAmex) {
      cvcInput.attr('maxlength', 4)
    } else {
      cvcInput.attr('maxlength', 3)
    }
  },

  cvcTrim = function(){
    if (this.value.length > this.maxLength) {
      this.value = this.value.slice(0, this.maxLength);
    }
  }

  getSupportedChargeType = function(name){
    var card =  cards.filter('.' + name).first();
    return {
      debit: card.attr('data-debit'),
      credit: card.attr('data-credit')
    };
  },
  checkCardtypeIsAllowed = function(){
    var defer = $.Deferred();
      var card = getCardType();
      // this should already be picked up by the other validations
      if (card.length !== 1) return defer.resolve();
      $.post('/check_card/' + chargeId,
        {cardNo: cardInput.val().replace(/\D/g,'') }
      ).then(function(data){
        if (data.accepted) return defer.resolve();
        return defer.reject({text: data.message});
      })

    return defer.promise();
  };


  return {
    init: init,
    checkCardtypeIsAllowed: checkCardtypeIsAllowed
  };
};
