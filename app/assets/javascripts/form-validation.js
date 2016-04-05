var formValidation = function(){
  var customValidations = module.cardValidations.fieldValidations,

  init = function(){
    registerHandlers();
  },

  registerHandlers = function(){
    $('form input').on('blur',checkPrevious);
  },

  checkPrevious = function(){
    checkValidations($(this).parents('.form-group'));
  },

  checkValidations = function(formGroup){
    var validation = $(formGroup).attr('data-validation'),
    input = $(formGroup).find('input');
    value = input.val();
    if (value.length === 0) {
      return false;
    }
    if (!customValidations[validation]){
      return true;
    }

    var isValid = customValidations[validation](input.val()) === true;
    $(formGroup).toggleClass('error',!isValid);
  };

  init();
}();
