const decryptCardDetails = require('../../app/middleware/decrypt_card_details.js')
const { expect } = require('chai')
const sinon = require('sinon')
const forge = require('node-forge')

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

describe.only('When CLOUDFRONT_PRIVATE_KEY is true', function () {
  const next = sinon.spy()
  const keypair = forge.pki.rsa.generateKeyPair({ bits: 1024, e: 0x10001 })

  it('should decrypt cardNo', () => {
    const encryptedCardDetails = Object.keys(decryptedCardDetails).reduce((encryptedMap, key) => {
      encryptedMap[key] = encryptValue(decryptedCardDetails[key], keypair.publicKey)
      return encryptedMap
    }, {})

    const request = {
      body: encryptedCardDetails
    }

    process.env.CLOUDFRONT_PRIVATE_KEY = forge.pki.privateKeyToPem(keypair.privateKey)
    decryptCardDetails(request, {}, next)
    expect(next.called).to.equal(true)
    expect(request.body).to.deep.equal(decryptedCardDetails)
  })
})

describe.only('When CLOUDFRONT_PRIVATE_KEY is not set', function () {
  const next = sinon.spy()

  it('should not decrypt cardNo', () => {
    const request = {
      body: decryptedCardDetails
    }

    process.env.CLOUDFRONT_PRIVATE_KEY = ''
    decryptCardDetails(request, {}, next)
    expect(next.called).to.equal(true)
    expect(request.body).to.equal(decryptedCardDetails)
  })
})
