require('../test-helpers/html-assertions.js')
const sinon = require('sinon')
const expect = require('chai').expect

const requireStaticController = function () {
  return require('../../app/controllers/static.controller.js')
}

describe('static controller', function () {
  describe('naxsi system error endpoint', function () {
    let request, response

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
