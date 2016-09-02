/*jslint node: true */
"use strict";
var views = require('../utils/views.js');
var logger= require('winston');

module.exports = {
  privacy: function(req,res){
    res.render('static/privacy');
  },
  humans: function(req,res){
    var _views = views.create();
    _views.display(res, "HUMANS");

  },
  naxsi_error: function(req,res){
    logger.info('NAXSI ERROR:- ' + req.headers["x-naxsi_sig"]);
    var _views = views.create();
    _views.display(res, "NAXSI_SYSTEM_ERROR");
  }
};
