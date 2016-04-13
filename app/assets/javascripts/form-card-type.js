var showCardType = function(){
  var form          = $('form#card-details'),
  cardInput         = form.find('input#card-no'),
  cards             = form.find('.accepted-cards > li');

  var init = function(){
    cardInput.on('keyup',showCardType);
  },


  showCardType = function(){
    console.log(module.creditCardType($(this).val()));
    var cardtype = module.creditCardType($(this).val());
  },
  unSelectAll = function(){
    cards.removeClass('.selected')
  };


  init();
}();
