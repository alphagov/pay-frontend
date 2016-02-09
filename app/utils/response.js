var logger = require('winston');

function response(accept, res, template, data) {
  res.render(template, data);
}

module.exports = {
  ERROR_MESSAGE : 'There is a problem with the payments platform',
  ERROR_VIEW : 'error',
  PAGE_NOT_FOUND_ERROR_MESSAGE : 'Page cannot be found',
  PROCESSING_PROBLEM_MESSAGE : 'There was a problem processing your payment. Please contact the service.',

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
  }
};
