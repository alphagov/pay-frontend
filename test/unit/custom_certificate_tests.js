var should = require('chai').should();
var assert = require('assert');
var customCertificate  = require(__dirname + '/../../app/utils/custom_certificate.js');

describe('custom certificate', function () {
  beforeEach(function(){
    process.env.CERTS_PATH = __dirname + '/../test_helpers/certs';
  });

  afterEach(function(){
    process.env.CERTS_PATH = undefined;
  });
  
  it('should set secure options', function(){
    let ca = customCertificate.getCertOptions();
    assert.equal(1, ca.length);
  });
});
