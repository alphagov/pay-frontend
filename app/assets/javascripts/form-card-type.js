var showCardType = function(){
  var form          = $('form#card-details'),
  acceptedCards     = form.find('.accepted-cards'),
  cardInput         = form.find('input#card-no'),
  cards             = form.find('.accepted-cards > li');

  var init = function(){
    cardInput.on('keyup',showCardType);
  },

  showCardType = function(){
    var cardType = module.creditCardType($(this).val().replace(/\D/g,''));
    unSelectAll();
    checkEmpty();
    console.log(getCardTypes());
    if (cardType.length !== 1) return;
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
  }


  init();
}();
