"use strict";
var confirmInput = function() {
  var $inputs = $('[data-confirmation]'),
      makeConfirmation,
      addFor,
      update;

  makeConfirmation = function(id) {
    var confirmation = [
          '<div class="form-group panel panel-border-wide input-confirm">',
              '<p class="form-hint">',
                  'An email will be sent to: <span class="email"></span>',
              '</p>',
          '</div>'
        ].join(''),
        $elm;

    $elm = $(confirmation);
    $elm.attr('id', id);
    return $elm;
  };

  addFor = function ($input, $confirmation) {
    var $formGroup = $input.closest('.form-group');

    $confirmation.insertAfter($formGroup);
  };

  update = function (e) {
    var $input = $(e.target),
        value = $input.val(),
        confirmationId = $input.attr('id') + '-confirmation',
        $confirmation = $('#' + confirmationId);

    if ($confirmation.length === 0) {
      $confirmation = makeConfirmation(confirmationId);
      addFor($input, $confirmation);
    }

    if (value === '') {
      $confirmation.remove();
    } else {
      $confirmation.find('.email').text(value);
    }
  };

  $inputs.on('input', update);
};
