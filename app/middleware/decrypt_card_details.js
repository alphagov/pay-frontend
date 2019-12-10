'use strict'

const forge = require('node-forge')

const ENCRYPTED_FIELDS = ['cardNo', 'cvc', 'addressPostcode', 'expiryYear', 'expiryMonth']
const PRIVATE_KEY = process.env.CLOUDFRONT_PRIVATE_KEY ? forge.pki.privateKeyFromPem(process.env.CLOUDFRONT_PRIVATE_KEY) : null

const decryptReqBodyField = (req, res, fieldName) => {
  if (req.body[fieldName]) {
    req.body[fieldName] = decrypt(req.body[fieldName])
  }
}

const decrypt = (value) => {
  // Cloudfront base64-encodes the encrypted value
  const encrypted = forge.util.decode64(value)

  // According to: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/field-level-encryption.html#field-level-encryption-decrypt
  // CloudFront uses "RSA/ECB/OAEPWithSHA-256AndMGF1Padding" as the algorithm for
  // encrypting, so you must use the same algorithm to decrypt the data.
  const decrypted = PRIVATE_KEY.decrypt(encrypted, 'RSA-OAEP', {
    md: forge.md.sha256.create(),
    mgf1: {
      md: forge.md.sha1.create()
    }
  })

  // Make sure we return UTF-8
  return forge.util.encodeUtf8(decrypted)
}

module.exports = function (req, res, next) {
  if (PRIVATE_KEY) {
    ENCRYPTED_FIELDS.forEach(fieldName => decryptReqBodyField(req, res, fieldName))
  }

  next()
}
