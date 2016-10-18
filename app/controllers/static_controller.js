/*jslint node: true */
"use strict";
var views = require('../utils/views.js');
var logger= require('winston');
var ANALYTICS_ERROR = require('../utils/analytics.js').ANALYTICS_ERROR;

module.exports = {
  privacy: function(req,res){
    res.render('static/privacy');
  },
  humans: function(req,res){
    var _views = views.create();
    _views.display(res, "HUMANS", ANALYTICS_ERROR);

  },
  naxsi_error: function(req,res){
    logger.error('NAXSI ERROR:- ' + req.headers["x-naxsi_sig"]);
    var _views = views.create();
    _views.display(res, "NAXSI_SYSTEM_ERROR", ANALYTICS_ERROR);
  }
};
