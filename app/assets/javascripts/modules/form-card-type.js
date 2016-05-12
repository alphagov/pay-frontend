var showCardType = function(){
  var form          = $('form#card-details'),
  acceptedCards     = form.find('.accepted-cards'),
  cardInput         = form.find('input#card-no'),
  cards             = form.find('.accepted-cards > li'),
  cardNoLabel       = form.find('.card-no-label'),
  cardNoFormGroup   = form.find('.card-no-group'),
  notSupportedString= i18n.chargeController.fieldErrors.fields.cardNo.card_not_supported,
  nonNumberString   = i18n.chargeController.fieldErrors.fields.cardNo.non_numeric,
  validations       = module.chargeValidation(i18n.chargeController.fieldErrors,console),
  cardValidation    = validations.creditCardType,
  cardTypes         = validations.allowedCards,
  amexCvcTip        = form.find('.amex-cvc'),
  genericCvcTip     = form.find('.generic-cvc');

  var init = function(){
    cardInput
      .on('blur',unselectIfInvalid)
      .on('keyup',showCardType);

  },

  unselectIfInvalid = function(){
    if (cardIsInvalid()) unSelectAll();
  },

  cardIsInvalid = function(){
    return validations.cardNo(cardInput.val()) !== true;
  },

  showCardType = function(){
    var number = $(this).val().replace(/\D/g,'');
    var cardType = cardValidation(number);
    unSelectAll();
    checkEmpty();
    checkAllowed(cardType);
    checkNumeric($(this).val(), number);
    cvcHighlight(); // to reset
    if (cardType.length !== 1) return;
    cvcHighlight(cardType[0].type);
    selectCard(cardType[0].type);
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
    var supported = $.inArray(cardType[0].type,cardTypes) !== -1;

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
  };


  init();
}();
