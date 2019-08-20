const pactBase = require('./pact_base')()

const validDdcJwt = function validDdcJwt () {
  const data = {
    'jwt': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
  }

  return {
    getPactified: () => {
      return pactBase.pactify(data)
    },
    getPlain: () => {
      return data
    }
  }
}

module.exports = {
  validDdcJwt
}
