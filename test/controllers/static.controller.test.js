var path = require('path')
require(path.join(__dirname, '/../test_helpers/html_assertions.js'))
var sinon = require('sinon')
var expect = require('chai').expect

var requireStaticController = function () {
  return require(path.join(__dirname, '/../../app/controllers/static_controller.js'))
}

describe('static controller', function () {
  describe('naxsi system error endpoint', function () {
    var request, response

    before(function () {
      request = {
        headers: {}
      }

      response = {
        redirect: sinon.spy(),
        render: sinon.spy(),
        status: sinon.spy()
      }
    })

    it('should render ok', function () {
      requireStaticController().naxsi_error(request, response)
      expect(response.render.calledWith('error')).to.be.true // eslint-disable-line
      expect(response.status.calledWith(400)).to.be.true // eslint-disable-line
    })
  })
})
