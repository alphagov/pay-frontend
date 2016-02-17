var logger = require('winston');

function response(accept, res, template, data) {
    res.render(template, data);
}


var ERROR_MESSAGE = 'There is a problem with the payments platform',
    ERROR_VIEW = 'error',
    PAGE_NOT_FOUND_ERROR_MESSAGE = 'Page cannot be found',
    PROCESSING_PROBLEM_MESSAGE = 'There was a problem processing your payment. Please contact the service.';

module.exports = {
  ERROR_MESSAGE : ERROR_MESSAGE,
  ERROR_VIEW : ERROR_VIEW,
  PAGE_NOT_FOUND_ERROR_MESSAGE : PAGE_NOT_FOUND_ERROR_MESSAGE,
  PROCESSING_PROBLEM_MESSAGE : PROCESSING_PROBLEM_MESSAGE,

  response : response,

  renderErrorView : function (req, res, msg) {
    logger.error('An error occurred: ' + msg);
    response(req.headers.accept, res, 'error', {
      'message': msg
    });
  },
  renderErrorViewWithReturnUrl : function (req, res, msg, returnUrl) {
    logger.error('An error occurred: ' + msg);
    response(req.headers.accept, res, 'error_with_return_url', {
      'message': msg,
      'return_url' : returnUrl
    });
  },

  genericError: function(res){
    res.render(ERROR_VIEW, ERROR_MESSAGE);
  },

  pageNotFound: function(res){
  res.render(ERROR_VIEW, {
    'message': PAGE_NOT_FOUND_ERROR_MESSAGE
  });
  }
};
