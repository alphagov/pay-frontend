module.exports = {
  ERROR_MESSAGE : 'There is a problem with the payments platform',

  response : function(accept, res, template, data) {
    if (accept === "application/json") {
      res.setHeader('Content-Type', 'application/json');
      res.json(data);
    } else {
      res.render(template, data);
    }
  }
};
