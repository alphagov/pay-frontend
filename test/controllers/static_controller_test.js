/*jslint node: true */

require(__dirname + '/../test_helpers/html_assertions.js');
var sinon = require('sinon');
var expect = require('chai').expect;

var requireStaticController = function () {
  return require(__dirname + '/../../app/controllers/static_controller.js');
};

describe('static controller', function () {
  describe('privacy endpoint', function () {

    var request, response;

    before(function () {

      request = {
      };

      response = {
        redirect: sinon.spy(),
        render: sinon.spy(),
        status: sinon.spy()
      };
    });


    it('should render ok', function () {
      requireStaticController().privacy(request, response);
      expect(response.render.calledWith('static/privacy')).to.be.true;
    });
  });


  describe('naxsi system error endpoint', function () {

    var request, response;

    before(function () {

      request = {
      };

      response = {
        redirect: sinon.spy(),
        render: sinon.spy(),
        status: sinon.spy()
      };
    });


    it('should render ok', function () {
      requireStaticController().naxsi_error(request, response);
      expect(response.render.calledWith('error')).to.be.true;
      expect(response.status.calledWith(400)).to.be.true;

    });
  });




});
