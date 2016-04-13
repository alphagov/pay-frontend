var showCardType = function(){
  var form          = $('form#card-details'),
  cardInput         = form.find('input#card-no'),
  cards             = form.find('.accepted-cards > li');

  var init = function(){
    cardInput.on('keyup',showCardType);
  },

  showCardType = function(){
    var cardType = module.creditCardType($(this).val().replace(/\D/g,''));
    unSelectAll();
    if (cardType.length !== 1) return;
    selectCard(cardType[0].type);
  },

  unSelectAll = function(){
    cards.removeClass('selected');
  },
  selectCard = function(name){
    cards.filter('.' + name).addClass('selected');
  };


  init();
}();
