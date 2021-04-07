require('../test-helpers/html-assertions.js')
var sinon = require('sinon')
var expect = require('chai').expect

var requireStaticController = function () {
  return require('../../app/controllers/static.controller.js')
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
