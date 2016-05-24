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
  amexCvcTip        = form.find('.amex-cvc'),
  genericCvcTip     = form.find('.generic-cvc');

  var init = function(){
    cardInput
      .on('blur',unselectIfNotAvailable)
      .on('keyup',showCardType);
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
    if (cardType.length !== 1) return;
    cvcHighlight(cardType[0].type);
    selectCard(cardType[0].type);
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
      if (cardTypes[i].type == cardType[0].type) supported = true;
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

  getSupportedChargeType = function(name){
    var card =  cards.filter('.' + name).first();
    return {
      debit: card.attr('data-debit'),
      credit: card.attr('data-credit')
    };
  },
  checkCardtypeIsAllowed = function(){
    var defer = $.Deferred();
    // this should all be replaced by an ajax call once we have the api for this
    // use getSupportedChargeType(cardName) to get the debit/credit for each
    // card type

    setTimeout(function(){
      var card = getCardType();
      // this should already be picked up by the other validations
      if (card.length !== 1) return defer.resolve();

      var cardName = card[0].type;
      if (cardName === "jcb" && location.search.indexOf('debitOnly=true') >= 0) {
        return defer.reject({text: "jcb credit cards are"});
      }
      return defer.resolve();
    }, 500);
    // end of replace

    return defer.promise();
  };


  return {
    init: init,
    checkCardtypeIsAllowed: checkCardtypeIsAllowed
  };
};


showCardType().init();
