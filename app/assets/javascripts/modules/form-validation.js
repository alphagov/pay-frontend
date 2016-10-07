"use strict";
var formValidation = function(){
  var form          = $('form#card-details'),
  formInputs        = form.find('input'),
  countrySelect     = form.find('select#address-country'),
    postcodeInput   = form.find('input#address-postcode'),
    cardInput       = form.find('input#card-no'),
  errorSummary      = $('.error-summary'),
  logger            = {info: function(){}}, // replace with console to see output
  // window.card comes from the view
  chargeValidations = module.chargeValidation(i18n.chargeController.fieldErrors,logger,$.extend({},window.Card)),
  required          = chargeValidations.required;


  var init = function(){
    form.on('submit', checkFormSubmission);
    formInputs.on('blur', checkPreviousFocused);
    countrySelect.on('change', function() {
      checkValidation(postcodeInput);
    });
  },

  checkFormSubmission = function(e){
    var validations = allValidations();
    var form = this;
    e.preventDefault();
    showCardType().checkCardtypeIsAllowed().then(function(){
      if (!validations.hasError) return form.submit();
      addValidationsErrors();
    },function(error){
      addValidationsErrors();
    });
  },

  addValidationsErrors = function(){
    addAllValidations();
    generateHighlightBlock();
  },

  addCardError = function(error){
    var formGroup = getFormGroup(cardInput);
    replaceLabel( error.text, formGroup);
    prependHighlightError({cssKey: 'card-no', value: error.text});
    $(formGroup).addClass('error');
  },

  addAllValidations = function(){
    var fields = allFields();
    for (var field in fields) {
      checkValidation(fields[field]);
    }
  },

  generateHighlightBlock = function(){
    errorSummary.removeClass('hidden').attr('aria-hidden','false');
    $('.error-summary-list').empty();
    appendHighlightErrors();

    location.hash = "";
    setTimeout(function(){ location.hash = "#error-summary"; }, 10);
  },

  appendHighlightErrors = function(){
    var errors = allValidations().errorFields;
    for (var key in errors) {
      var error = errors[key];
      appendHighlightError(error);
    }
  },
  appendHighlightError = function(error){
    addHighlightError('append',error);
  },

  prependHighlightError= function(error) {
    addHighlightError('prepend',error);
  },
  addHighlightError = function(addType,error){
    $('.error-summary-list')[addType]("<li><a href='#" + error.cssKey + "-lbl' id='" + error.cssKey + "-error'>" + error.value + "</a></li>");
  },


  checkPreviousFocused = function(){
    var input = this;
    setTimeout(function(){ // document.activelement is set to body unless you do this
      checkValidationInline(input);
    },50);
  },

  checkValidationInline = function(input){
    var blank     = $(input).val().length === 0,
    group         = getFormGroup(input),
    // validation happens on blur, check which input the user is on now
    focusedGroup  = getFormGroup($(document.activeElement)),
    inGroup       = focusedGroup.is(group),
    groupHasError = getFormGroup(input).hasClass('error'),
    lastOfgroup   = $(input).is('[data-last-of-form-group]'),
    required      = $(input).is('[data-required]');
    if ((lastOfgroup && required) || groupHasError) return checkValidation(input);
    if (inGroup || blank) return;
    checkValidation(input);
  },

  checkValidation = function(input){
    var formGroup = getFormGroup(input),
    validationName= getFormGroupValidation(formGroup),
    validation    = validationFor(validationName);

    if ($(input).is(cardInput)) {
      checkCardType(validation, formGroup);
      return;
    }

    replaceOnError(validation, formGroup);
  },

  checkCardType = function(validation, formGroup){
    showCardType().checkCardtypeIsAllowed()
    .then(function(){
      replaceOnError(validation, formGroup);

    },function(error){
      addCardError(error);
    });
  },
  replaceOnError = function(validation, formGroup){
    var validated = validation === undefined;
    replaceLabel(validation, formGroup);
    $(formGroup).toggleClass('error',!validated);
  },

  replaceLabel = function(validation, formGroup){
    var label = formGroup.find('[data-label-replace]');
    if (label.length === 0) return;
    if (validation) {
      label.text(validation).attr('role','alert');
    } else {
      label.text(label.attr('data-original-label')).removeAttr('role');
    }
  },

  validationFor = function(name){
     var validation =$.grep(allValidations().errorFields,function(validation){
      return validation.key == name;
    });
     if (!validation[0]) return;
     return validation[0].value;
  },

  allFields = function(){
    var fields = {};
    $(required).each(function(index,requiredField){
      fields[requiredField] = findInputByKey(requiredField);
    });
    return fields;
  },

  allFieldValues = function(){
    var values = {};
    $(required).each(function(index,requiredField){
      values[requiredField] =findInputByKey(requiredField).val();
    });
    return values;
  },


  allValidations = function(){
    return chargeValidations.verify(allFieldValues());
  },

  getFormGroup = function(input) {
    return $(input).parents('.form-group');
  },

  getFormGroupValidation = function(formGroup){
    return $(formGroup).attr('data-validation');
  },
  findInputByKey = function(key){
    return $("input[name=" + key + "], select[name=" + key + "]").first();
  };


  init();
};
