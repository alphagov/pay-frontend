module.exports = {
  response : function(accept, res, template, data) {
    if (accept === "application/json") {
      res.setHeader('Content-Type', 'application/json');
      res.json(data);
    } else {
      res.render(template, data);
    }
  },

  redirect : function(res, location) {
    res.redirect(301, location);
  }
};
