/*jslint node: true */
"use strict";
var views = require('../utils/views.js');

module.exports = {
  privacy: function(req,res){
    res.render('static/privacy');
  },

  naxsi_error: function(req,res){
    var _views = views.create();
    _views.display(res, "NAXSI_SYSTEM_ERROR");
  }
};
