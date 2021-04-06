'use strict'

const logger = require('../utils/logger')(__filename)
const decryptNode = require('@aws-crypto/decrypt-node')
const rawRsaKeyringNode = require('@aws-crypto/raw-rsa-keyring-node')
const cardDataFields = require('../../config/card-data-fields')

function getMandatoryEnvironmentVariable (env, key) {
  const result = env[key]
  if (!result) {
    throw new Error(`Environment variable ${key} is required when DECRYPT_AND_OMIT_CARD_DATA is set to true`)
  }
  return result
}

/**
 * Creates a middleware function which will decrypt request parameters
 * encrypted with AWS CloudFront's Field Level Encryption found in the request.
 *
 * Modifies req.body so handlers can deal with plaintext parameters.
 *
 * @param {Object} env - A map of environment variables.
 *   DECRYPT_AND_OMIT_CARD_DATA      - if true, all other parameters are required. Otherwise returns an empty piece of middleware.
 *   DECRYPT_CARD_DATA_PRIVATE_KEY   - a PEM formatted RSA private key
 *   DECRYPT_CARD_DATA_KEY_NAME      - can be found on https://console.aws.amazon.com/cloudfront/home#publickey:
 *   DECRYPT_CARD_DATA_KEY_NAMESPACE - the "Provider name" (NOT the "Profile name") from the FLE profile
 *                                     https://console.aws.amazon.com/cloudfront/home#fle: shows a list of FLE profiles.
 */
function createMiddleware (env) {
  const isEnabled = env.DECRYPT_AND_OMIT_CARD_DATA
  if (isEnabled !== 'true') {
    return function noopMiddelware (_req, _res, next) { next() }
  }

  const privateKey = getMandatoryEnvironmentVariable(env, 'DECRYPT_CARD_DATA_PRIVATE_KEY')
  const keyName = getMandatoryEnvironmentVariable(env, 'DECRYPT_CARD_DATA_KEY_NAME')
  const keyNamespace = getMandatoryEnvironmentVariable(env, 'DECRYPT_CARD_DATA_KEY_NAMESPACE')

  const keyring = new rawRsaKeyringNode.RawRsaKeyringNode({
    keyName,
    keyNamespace,
    rsaKey: { privateKey },
    oaepHash: 'sha256'
  })

  return function decryptCardDataMiddleware (req, _res, next) {
    const fieldsToDecrypt = cardDataFields.filter(x => req.body[x] !== undefined)
    Promise.all(fieldsToDecrypt.map(async (fieldName) => {
      const cipherText = req.body[fieldName]
      try {
        const result = await decryptNode.decrypt(keyring, Buffer.from(cipherText, 'base64'))
        req.body[fieldName] = result.plaintext.toString('utf8')
      } catch (rejection) {
        logger.error('Failed to decrypt', { fieldName })
        throw rejection
      }
    })).then(() => {
      next()
    }).catch((err) => {
      next(err)
    })
  }
}

module.exports = createMiddleware
