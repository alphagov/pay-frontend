module.exports = {
  response : function(accept, res, data) {
    if (accept == "application/json") {
      res.setHeader('Content-Type', 'application/json');
      res.json(data);
    } else {
      res.render('greeting', data);
    }
  }
};
