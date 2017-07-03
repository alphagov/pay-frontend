var path = require('path')
var assert = require('assert')
var customCertificate = require(path.join(__dirname, '/../../app/utils/custom_certificate.js'))

describe('custom certificate', function () {
  beforeEach(function () {
    process.env.CERTS_PATH = path.join(__dirname, '/../test_helpers/certs')
  })

  afterEach(function () {
    process.env.CERTS_PATH = undefined
  })

  it('should set secure options', function () {
    let ca = customCertificate.getCertOptions()
    assert.equal(1, ca.length)
  })
})
