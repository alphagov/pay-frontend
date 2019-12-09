'use strict'

const forge = require('node-forge')

const encryptedFields = ['cardNo', 'cvc', 'addressPostcode', 'expiryYear', 'expiryMonth']

const decryptReqBodyField = (req, res, fieldName, privateKey) => {
  if (req.body[fieldName]) {
    req.body[fieldName] = decrypt(req.body[fieldName], privateKey)
  }
}

const decrypt = (value, privateKey) => {
  // Cloudfront base64-encodes the encrypted value
  var encrypted = forge.util.decode64(value)

  // According to: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/field-level-encryption.html#field-level-encryption-decrypt
  // CloudFront uses "RSA/ECB/OAEPWithSHA-256AndMGF1Padding" as the algorithm for
  // encrypting, so you must use the same algorithm to decrypt the data.
  var decrypted = privateKey.decrypt(encrypted, 'RSA-OAEP', {
    md: forge.md.sha256.create(),
    mgf1: {
      md: forge.md.sha1.create()
    }
  })

  // Make sure we return UTF-8
  return forge.util.encodeUtf8(decrypted)
}

module.exports = function (req, res, next) {
  const privateKey = process.env.CLOUDFRONT_PRIVATE_KEY ? forge.pki.privateKeyFromPem(process.env.CLOUDFRONT_PRIVATE_KEY) : null

  if (privateKey) {
    encryptedFields.forEach(fieldName => decryptReqBodyField(req, res, fieldName, privateKey))
  }

  next()
}
