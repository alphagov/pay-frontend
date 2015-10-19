var logger = require('winston');

function response(accept, res, template, data) {
  if (accept === "application/json") {
    res.setHeader('Content-Type', 'application/json');
    res.json(data);
  } else {
    res.render(template, data);
  }
}

module.exports = {
  ERROR_MESSAGE : 'There is a problem with the payments platform',
  ERROR_VIEW : 'error',
  PAGE_NOT_FOUND_ERROR_MESSAGE : 'Page cannot be found',

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
