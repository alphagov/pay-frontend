'use strict'

// core dependencies
const path = require('path')

// npm dependencies
const {expect} = require('chai')
const customCertificate = require('../../app/utils/custom_certificate.js')

// constants
const CERTS_PATH = path.join(__dirname, '/../test_helpers/certs')

describe('custom certificate', () => {
  it('should set secure options', () => {
    const ca = customCertificate.getCertOptions(CERTS_PATH)
    expect(ca.length).to.equal(1)
  })
})
