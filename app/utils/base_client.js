/**
 * @typedef {Object} NodeRestClient
 */
const Client      = require('node-rest-client').Client;
const withCorrelationHeader = require('../utils/correlation_header.js').withCorrelationHeader;

var client      = new Client();

const headers = { "Content-Type": "application/json" };
const config  = { "keepAlive": true };

/*
 * @module baseClient
 */
module.exports = {
  /**
   *
   * @param {string} url
   * @param {Object} args
   * @param {function} callBack
   *
   * @returns {NodeRestClient}
   */
  post : function (url, args, callBack) {
    return client.post(
      url,
      withCorrelationHeader({data: args.data, headers: headers, requestConfig: config}, args.correlationId),
      callBack);
  },

  /**
   *
   * @param {string} url
   * @param {Object} args
   * @param {function} callBack
   *
   * @returns {NodeRestClient}
   */
  get: function(url, args, callBack) {
    return client.get(
      url,
      withCorrelationHeader({ data: args.data, requestConfig: config }, args.correlationId),
      callBack);
  },

  /**
   *
   * @param {string} url
   * @param {Object} args
   * @param {function} callBack
   *
   * @returns {NodeRestClient}
   */
  put: function(url, args, callBack) {
    return client.put(
      url,
      withCorrelationHeader({ data: args.data, headers: headers, requestConfig: config }, args.correlationId),
      callBack);
  },

  /**
   *
   * @param {string} url
   * @param {Object} args
   * @param {function} callBack
   *
   * @returns {NodeRestClient}
   */
  patch: function(url, args, callBack) {
    return client.patch(
      url,
      withCorrelationHeader({ data: args.data, headers: headers, requestConfig: config }, args.correlationId),
      callBack);
  },

  /**
   *
   * @param {string} url
   * @param {Object} args
   * @param {function} callBack
   *
   * @returns {NodeRestClient}
   */
  delete: function(url, args, callBack) {
    return client.delete(
      url,
      withCorrelationHeader({ data: args.data, requestConfig: config }, args.correlationId),
      callBack);
  }
};