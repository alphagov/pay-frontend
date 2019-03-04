var path = require('path')
require(path.join(__dirname, '/../test_helpers/html_assertions.js'))
var proxyquire = require('proxyquire').noPreserveCache()
var chai = require('chai')
var chaiAsPromised = require('chai-as-promised')

var sinon = require('sinon')
var expect = chai.expect

chai.use(chaiAsPromised)

let requireController = function () {
  return proxyquire(path.join(__dirname, '/../../../../app/controllers/web-payments/apple-pay/merchantid-domain-association-controller.js'))
}

describe('apple-pay merchantid domain association controller', function () {
  let request, response

  beforeEach(function () {
    request = {}

    response = {
      redirect: sinon.spy(),
      render: sinon.spy(),
      status: sinon.spy()
    }
  })

  it('should respond with 404 when APPLE_PAY_MERCHANT_ID_DOMAIN_ASSOCIATION is not set', function () {
    requireController().return(request, response)
    expect(response.status.calledWith(404)).to.be.true // eslint-disable-line
  })

  it('should respond with value of APPLE_PAY_MERCHANT_ID_DOMAIN_ASSOCIATION when it is set', function (done) {
    process.env.APPLE_PAY_MERCHANT_ID_DOMAIN_ASSOCIATION = 'test_value'
    requireController().return(request, response)
    expect(response.status.calledWith(200)).to.be.true // eslint-disable-line
    expect(response.render.calledWith('test_value')).to.be.true // eslint-disable-line
  })
})
