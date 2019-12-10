const { expect } = require('chai')
const sinon = require('sinon')
const forge = require('node-forge')

// proxyrequire is necessary to reload the script under test after changing
// the envs between tests.
const proxyquire = require('proxyquire').noPreserveCache()

const keypair = forge.pki.rsa.generateKeyPair({ bits: 1024, e: 0x10001 })

const decryptedCardDetails = {
  cardNo: 'something',
  cvc: 'cvc value',
  addressPostcode: 'address postcode',
  expiryYear: 'expiry yeah',
  expiryMonth: 'expiry month'
}

const encryptValue = (value, publicKey) => {
  // Need to return base64(encrypt(utf8bytes(value)))
  var bytes = forge.util.decodeUtf8(value)
  var encrypted = publicKey.encrypt(bytes, 'RSA-OAEP', {
    md: forge.md.sha256.create(),
    mgf1: {
      md: forge.md.sha1.create()
    }
  })
  return forge.util.encode64(encrypted)
}

const encryptMapValues = (mapToEncrypt) => {
  return Object.keys(mapToEncrypt).reduce((encryptedMap, key) => {
    encryptedMap[key] = encryptValue(decryptedCardDetails[key], keypair.publicKey)
    return encryptedMap
  }, {})
}

describe.only('When CLOUDFRONT_PRIVATE_KEY is set', function () {
  const next = sinon.spy()

  it('should decrypt card data', () => {
    const request = {
      body: encryptMapValues(decryptedCardDetails)
    }

    process.env.CLOUDFRONT_PRIVATE_KEY = forge.pki.privateKeyToPem(keypair.privateKey)
    const decryptCardDetails = proxyquire('../../app/middleware/decrypt_card_details.js', {})
    decryptCardDetails(request, {}, next)
    expect(next.called).to.equal(true)
    expect(request.body).to.deep.equal(decryptedCardDetails)
  })
})

describe.only('When CLOUDFRONT_PRIVATE_KEY is not set', function () {
  const next = sinon.spy()

  it('should not decrypt card data', () => {
    const request = {
      body: decryptedCardDetails
    }

    process.env.CLOUDFRONT_PRIVATE_KEY = ''
    const decryptCardDetails = proxyquire('../../app/middleware/decrypt_card_details.js', {})
    decryptCardDetails(request, {}, next)
    expect(next.called).to.equal(true)
    expect(request.body).to.equal(decryptedCardDetails)
  })
})
