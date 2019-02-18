const path = require('path')
const pactBase = require(path.join(__dirname, '/pact_base'))()
const successfulLastDigitsCardNumber = 4242

const fixtures = {
  googleAuthRequestDetails: (ops = {}) => {
    const data = {
      payment_info: {
        last_digits_card_number: ops.lastDigitsCardNumber || successfulLastDigitsCardNumber,
        brand: 'master-card',
        cardholder_name: 'Some Name',
        email: 'name@email.fyi'
      },
      encrypted_payment_data: {
        signature: 'MEQCIB54h8T/hWY3864Ufkwo4SF5IjhoMV9hjpJRIsqbAn4LAiBZz1VBZ+aiaduX8MN3dBtzyDOZVstwG/8bqJZDbrhKfQ=',
        protocol_version: 'ECv1',
        signed_message: 'aSignedMessage'
      }
    }
    return {
      getPactified: () => {
        return pactBase.pactify(data)
      },
      getPlain: () => {
        return data
      }
    }
  },
  googleAuthSuccessResponse: () => {
    const data = {
      status: 'AUTHORISATION SUCCESS'
    }
    return {
      getPactified: () => {
        return pactBase.pactify(data)
      },
      getPlain: () => {
        return data
      }
    }
  },
  googleAuthFailedResponse: (message) => {
    const data = {
      message: message
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
}

module.exports = fixtures
