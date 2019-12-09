'use strict'

const encryptedFields = ['cardNo', 'cvc', 'addressPostcode', 'expiryYear', 'expiryMonth']

const decryptReqBodyField = (req, res, fieldName) => {
  if (req.body[fieldName]) {
    req.body[fieldName] = decrypt(req.body[fieldName])
  }
}

const decrypt = value => {
  return value.replace('encrypted', '')
}

module.exports = function (req, res, next) {
  console.log('HERE')
  console.log(process.env.CLOUDFRONT_PRIVATE_KEY)
  if (process.env.CLOUDFRONT_PRIVATE_KEY) {
    encryptedFields.forEach(fieldName => decryptReqBodyField(req, res, fieldName))
  }

  next()
}
