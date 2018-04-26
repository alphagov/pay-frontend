'use strict'

const cookies = require('./cookies')
const {randomUuid} = require('./random')

module.exports = {
  userPersistenceMiddleware: (req, res, next) => {
    let userId = cookies.getSessionVariable(req, 'userId')

    if (!userId) {
      userId = randomUuid()
      cookies.setSessionVariable(req, 'userId', userId)
    }

    req.userId = userId

    next()
  }
}
