const path = require('path')
const pactBase = require(path.join(__dirname, '/pact_base'))()
const successfulLastDigitsCardNumber = 4242

const fixtures = {
  googleAuthRequestDetails: (ops = {}) => {
    const data = {
      payment_info: {
        last_digits_card_number: ops.lastDigitsCardNumber !== undefined ? ops.lastDigitsCardNumber : successfulLastDigitsCardNumber,
        brand: 'master-card',
        cardholder_name: 'Some Name',
        email: 'name@email.fyi',
        accept_header: 'text/html;q=1.0, */*;q=0.9',
        user_agent_header: 'Mozilla/5.0',
        ip_address: '203.0.113.1'
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
  webPaymentSuccessResponse: () => {
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
  appleAuthRequestDetails: (ops = {}) => {
    const data = {
      payment_info: {
        last_digits_card_number: ops.lastDigitsCardNumber !== undefined ? ops.lastDigitsCardNumber : successfulLastDigitsCardNumber,
        brand: 'master-card',
        cardholder_name: 'Some Name'
      },
      encrypted_payment_data: {
        signature: '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',
        version: 'ECv1',
        data: '4OZho15e9Yp5K0EtKergKzeRpPAjnKHwmSNnagxhjwhKQ5d29sfTXjdbh1CtTJ4DYjsD6kfulNUnYmBTsruphBz7RRVI1WI8P0LrmfTnImjcq1mi+BRN7EtR2y6MkDmAr78anff91hlc+x8eWD/NpO/oZ1ey5qV5RBy/Jp5zh6ndVUVq8MHHhvQv4pLy5Tfi57Yo4RUhAsyXyTh4x/p1360BZmoWomK15NcJfUmoUCuwEYoi7xUkRwNr1z4MKnzMfneSRpUgdc0wADMeB6u1jcuwqQnnh2cusiagOTCfD6jO6tmouvu6KO54uU7bAbKz6cocIOEAOc6keyFXG5dfw8i3hJg6G2vIefHCwcKu1zFCHr4P7jLnYFDEhvxLm1KskDcuZeQHAkBMmLRSgj9NIcpBa94VN/JTga8W75IWAA==',
        header: {
          public_key_hash: 'LbsUwAT6w1JV9tFXocU813TCHks+LSuFF0R/eBkrWnQ=',
          ephemeral_public_key: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEMwliotf2ICjiMwREdqyHSilqZzuV2fZey86nBIDlTY8sNMJv9CPpL5/DKg4bIEMe6qaj67mz4LWdr7Er0Ld5qA==',
          transaction_id: '2686f5297f123ec7fd9d31074d43d201953ca75f098890375f13aed2737d92f2'
        }
      }
    }
    if (ops.email) {
      data.payment_info.email = ops.email
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
