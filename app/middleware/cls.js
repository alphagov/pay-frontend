'use strict'

const { createNamespace, getNamespace } = require('continuation-local-storage')
const { NAMESPACE_NAME } = require('../../config/cls')
createNamespace(NAMESPACE_NAME)

module.exports = (req, res, next) => {
  const namespace = getNamespace(NAMESPACE_NAME)
  namespace.bindEmitter(req)
  namespace.bindEmitter(res)
  namespace.run(() => {
    next()
  })
}
