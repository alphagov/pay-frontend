var analyticsTrackConfirmClick = function(){
  "use strict";

  var init = function(analyticsId, type, paymentProvider, hitPage) {
    var confirm = document.getElementById('confirm');
    confirm.addEventListener('click', function(){
      ga('send', {
        hitType: 'pageview',
        page: '{{hitPage}}',
        'dimension1':'{{analyticsId}}',
        'dimension2': '{{type}}',
        'dimension3':'{{paymentProvider}}'
      });
    }, false);
  };

  return {
    init: init
  };
};
