module.exports = {
  response : function(accept, res, template, data) {
    if (accept == "application/json") {
      res.setHeader('Content-Type', 'application/json');
      res.json(data);
    } else {
      res.render(template, data);
    }
  }
};
