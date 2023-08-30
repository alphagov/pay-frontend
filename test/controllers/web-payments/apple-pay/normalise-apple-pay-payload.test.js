const expect = require('chai').expect
const proxyquire = require('proxyquire')
const sinon = require('sinon')

const loggerInfoMock = sinon.spy()

const proxyquireMocks = {
  '../../../../app/utils/logger': () => {
    return {
      info: loggerInfoMock
    }
  }
}

const normalise = proxyquire('../../../../app/controllers/web-payments/apple-pay/normalise-apple-pay-payload.js',
  proxyquireMocks)

describe('normalise apple pay payload', function () {
  it('should return the correct format for the payload', function () {
    const applePayPayload = {
      shippingContact: {
        emailAddress: 'jonheslop@bla.test',
        familyName: 'payment',
        givenName: 'mr',
        phoneticFamilyName: '',
        phoneticGivenName: ''
      },
      token: {
        paymentData: {
          version: 'EC_v1',
          data: 'MLHhOn2BXhNw9wLLDR48DyeUcuSmRJ6KnAIGTMGqsgiMpc+AoJ…LUQ6UovkfSnW0sFH6NGZ0jhoap6LYnThYb9WT6yKfEm/rDhM=',
          signature: 'MIAGCSqGSIb3DQEHAqCAMIACAQExDzANBglghkgBZQMEAgEFAD…ZuQFfsLJ+Nb3+7bpjfBsZAhA1sIT1XmHoGFdoCUT3AAAAAAAA',
          header: {
            ephemeralPublicKey: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE5/Qc6z4TY5HQ5n…KC3kJ4DtIWedPQ70N35PBZzJUrFjtvDZFUvs80uo2ynu+lw==',
            publicKeyHash: 'Xzn7W3vsrlKlb0QvUAviASubdtW4BotWrDo5mGG+UWY=',
            transactionId: '372c3858122b6bc39c6095eca2f994a8aa012f3b025d0d72ecfd449c2a5877f9'
          }
        },
        paymentMethod: {
          displayName: 'MasterCard 1358',
          network: 'MasterCard',
          type: 'debit'
        },
        transactionIdentifier: '372C3858122B6BC39C6095ECA2F994A8AA012F3B025D0D72ECFD449C2A5877F9'
      }
    }
    const normalisedPayload = normalise({ body: applePayPayload })
    expect(normalisedPayload).to.eql(
      {
        payment_info: {
          last_digits_card_number: '1358',
          brand: 'master-card',
          card_type: 'DEBIT',
          cardholder_name: 'mr payment',
          email: 'jonheslop@bla.test',
          display_name: 'MasterCard 1358',
          network: 'MasterCard',
          transaction_identifier: '372C3858122B6BC39C6095ECA2F994A8AA012F3B025D0D72ECFD449C2A5877F9'
        },
        payment_data: '{"version":"EC_v1","data":"MLHhOn2BXhNw9wLLDR48DyeUcuSmRJ6KnAIGTMGqsgiMpc+AoJ…LUQ6UovkfSnW0sFH6NGZ0jhoap6LYnThYb9WT6yKfEm/rDhM=","signature":"MIAGCSqGSIb3DQEHAqCAMIACAQExDzANBglghkgBZQMEAgEFAD…ZuQFfsLJ+Nb3+7bpjfBsZAhA1sIT1XmHoGFdoCUT3AAAAAAAA","header":{"ephemeralPublicKey":"MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE5/Qc6z4TY5HQ5n…KC3kJ4DtIWedPQ70N35PBZzJUrFjtvDZFUvs80uo2ynu+lw==","publicKeyHash":"Xzn7W3vsrlKlb0QvUAviASubdtW4BotWrDo5mGG+UWY=","transactionId":"372c3858122b6bc39c6095eca2f994a8aa012f3b025d0d72ecfd449c2a5877f9"}}'
      }
    )

    const loggingPayload = {
      selected_payload_properties:
        {
          token: {
            paymentMethod: {
              displayName: 'MasterCard 1358',
              network: 'MasterCard',
              type: 'debit'
            }
          },
          shippingContact: {
            givenName: '(redacted non-blank string)',
            familyName: '(redacted non-blank string)',
            emailAddress: '(redacted non-blank string)'
          }
        }
    }

    sinon.assert.calledWithExactly(loggerInfoMock, 'Received Apple Pay payload', loggingPayload)
  })
  it('should return an empty string for last_digits_card_number when displayName does not have numeric values for last 4 characters', function () {
    const applePayPayload = {
      shippingContact: {
        emailAddress: 'jonheslop@bla.test',
        familyName: 'payment',
        givenName: 'mr',
        phoneticFamilyName: '',
        phoneticGivenName: ''
      },
      token: {
        paymentData: {
          version: 'EC_v1',
          data: 'MLHhOn2BXhNw9wLLDR48DyeUcuSmRJ6KnAIGTMGqsgiMpc+AoJ…LUQ6UovkfSnW0sFH6NGZ0jhoap6LYnThYb9WT6yKfEm/rDhM=',
          signature: 'MIAGCSqGSIb3DQEHAqCAMIACAQExDzANBglghkgBZQMEAgEFAD…ZuQFfsLJ+Nb3+7bpjfBsZAhA1sIT1XmHoGFdoCUT3AAAAAAAA',
          header: {
            ephemeralPublicKey: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE5/Qc6z4TY5HQ5n…KC3kJ4DtIWedPQ70N35PBZzJUrFjtvDZFUvs80uo2ynu+lw==',
            publicKeyHash: 'Xzn7W3vsrlKlb0QvUAviASubdtW4BotWrDo5mGG+UWY=',
            transactionId: '372c3858122b6bc39c6095eca2f994a8aa012f3b025d0d72ecfd449c2a5877f9'
          }
        },
        paymentMethod: {
          displayName: 'MasterCard ABDC',
          network: 'MasterCard',
          type: 'debit'
        },
        transactionIdentifier: '372C3858122B6BC39C6095ECA2F994A8AA012F3B025D0D72ECFD449C2A5877F9'
      }
    }
    const normalisedPayload = normalise({ body: applePayPayload })
    expect(normalisedPayload).to.have.deep.nested.property('payment_info',
      {
        last_digits_card_number: '',
        brand: 'master-card',
        card_type: 'DEBIT',
        cardholder_name: 'mr payment',
        email: 'jonheslop@bla.test',
        display_name: 'MasterCard ABDC',
        network: 'MasterCard',
        transaction_identifier: '372C3858122B6BC39C6095ECA2F994A8AA012F3B025D0D72ECFD449C2A5877F9'
      })
  })
  it('should return an empty string for last_digits_card_number when displayName is shorter than 4 characters', function () {
    const applePayPayload = {
      shippingContact: {
        emailAddress: 'jonheslop@bla.test',
        familyName: 'payment',
        givenName: 'mr',
        phoneticFamilyName: '',
        phoneticGivenName: ''
      },
      token: {
        paymentData: {
          version: 'EC_v1',
          data: 'MLHhOn2BXhNw9wLLDR48DyeUcuSmRJ6KnAIGTMGqsgiMpc+AoJ…LUQ6UovkfSnW0sFH6NGZ0jhoap6LYnThYb9WT6yKfEm/rDhM=',
          signature: 'MIAGCSqGSIb3DQEHAqCAMIACAQExDzANBglghkgBZQMEAgEFAD…ZuQFfsLJ+Nb3+7bpjfBsZAhA1sIT1XmHoGFdoCUT3AAAAAAAA',
          header: {
            ephemeralPublicKey: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE5/Qc6z4TY5HQ5n…KC3kJ4DtIWedPQ70N35PBZzJUrFjtvDZFUvs80uo2ynu+lw==',
            publicKeyHash: 'Xzn7W3vsrlKlb0QvUAviASubdtW4BotWrDo5mGG+UWY=',
            transactionId: '372c3858122b6bc39c6095eca2f994a8aa012f3b025d0d72ecfd449c2a5877f9'
          }
        },
        paymentMethod: {
          displayName: '123',
          network: 'MasterCard',
          type: 'debit'
        },
        transactionIdentifier: '372C3858122B6BC39C6095ECA2F994A8AA012F3B025D0D72ECFD449C2A5877F9'
      }
    }
    const normalisedPayload = normalise({ body: applePayPayload })
    expect(normalisedPayload).to.have.deep.nested.property('payment_info',
      {
        last_digits_card_number: '',
        brand: 'master-card',
        card_type: 'DEBIT',
        cardholder_name: 'mr payment',
        email: 'jonheslop@bla.test',
        display_name: '123',
        network: 'MasterCard',
        transaction_identifier: '372C3858122B6BC39C6095ECA2F994A8AA012F3B025D0D72ECFD449C2A5877F9'
      })
  })
  it('should return an empty string for last_digits_card_number when displayName is a blank string', function () {
    const applePayPayload = {
      shippingContact: {
        emailAddress: 'jonheslop@bla.test',
        familyName: 'payment',
        givenName: 'mr',
        phoneticFamilyName: '',
        phoneticGivenName: ''
      },
      token: {
        paymentData: {
          version: 'EC_v1',
          data: 'MLHhOn2BXhNw9wLLDR48DyeUcuSmRJ6KnAIGTMGqsgiMpc+AoJ…LUQ6UovkfSnW0sFH6NGZ0jhoap6LYnThYb9WT6yKfEm/rDhM=',
          signature: 'MIAGCSqGSIb3DQEHAqCAMIACAQExDzANBglghkgBZQMEAgEFAD…ZuQFfsLJ+Nb3+7bpjfBsZAhA1sIT1XmHoGFdoCUT3AAAAAAAA',
          header: {
            ephemeralPublicKey: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE5/Qc6z4TY5HQ5n…KC3kJ4DtIWedPQ70N35PBZzJUrFjtvDZFUvs80uo2ynu+lw==',
            publicKeyHash: 'Xzn7W3vsrlKlb0QvUAviASubdtW4BotWrDo5mGG+UWY=',
            transactionId: '372c3858122b6bc39c6095eca2f994a8aa012f3b025d0d72ecfd449c2a5877f9'
          }
        },
        paymentMethod: {
          displayName: '       ',
          network: 'MasterCard',
          type: 'debit'
        },
        transactionIdentifier: '372C3858122B6BC39C6095ECA2F994A8AA012F3B025D0D72ECFD449C2A5877F9'
      }
    }
    const normalisedPayload = normalise({ body: applePayPayload })
    expect(normalisedPayload).to.have.deep.nested.property('payment_info',
      {
        last_digits_card_number: '',
        brand: 'master-card',
        card_type: 'DEBIT',
        cardholder_name: 'mr payment',
        email: 'jonheslop@bla.test',
        display_name: '       ',
        network: 'MasterCard',
        transaction_identifier: '372C3858122B6BC39C6095ECA2F994A8AA012F3B025D0D72ECFD449C2A5877F9'
      })
  })
  it('should return an error when an unrecognizable card brand is passed in', function () {
    const applePayPayload = {
      shippingContact: {
        emailAddress: 'jonheslop@bla.test',
        familyName: 'payment',
        givenName: 'mr',
        phoneticFamilyName: '',
        phoneticGivenName: ''
      },
      token: {
        paymentData: {
          version: 'EC_v1',
          data: 'MLHhOn2BXhNw9wLLDR48DyeUcuSmRJ6KnAIGTMGqsgiMpc+AoJ…LUQ6UovkfSnW0sFH6NGZ0jhoap6LYnThYb9WT6yKfEm/rDhM=',
          signature: 'MIAGCSqGSIb3DQEHAqCAMIACAQExDzANBglghkgBZQMEAgEFAD…ZuQFfsLJ+Nb3+7bpjfBsZAhA1sIT1XmHoGFdoCUT3AAAAAAAA',
          header: {
            ephemeralPublicKey: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE5/Qc6z4TY5HQ5n…KC3kJ4DtIWedPQ70N35PBZzJUrFjtvDZFUvs80uo2ynu+lw==',
            publicKeyHash: 'Xzn7W3vsrlKlb0QvUAviASubdtW4BotWrDo5mGG+UWY=',
            transactionId: '372c3858122b6bc39c6095eca2f994a8aa012f3b025d0d72ecfd449c2a5877f9'
          }
        },
        paymentMethod: {
          displayName: 'Unsupportedcard',
          network: 'UnSupportedCard',
          type: 'debit'
        },
        transactionIdentifier: '372C3858122B6BC39C6095ECA2F994A8AA012F3B025D0D72ECFD449C2A5877F9'
      }
    }
    expect(() => normalise({ body: applePayPayload })).to.throw('Unrecognised card brand in Apple Pay payload: UnSupportedCard')
  })
  it('should return the correct format for the payload with min data', function () {
    const applePayPayload = {
      token: {
        paymentData: {
          version: 'EC_v1',
          data: 'MLHhOn2BXhNw9wLLDR48DyeUcuSmRJ6KnAIGTMGqsgiMpc+AoJ…LUQ6UovkfSnW0sFH6NGZ0jhoap6LYnThYb9WT6yKfEm/rDhM=',
          signature: 'MIAGCSqGSIb3DQEHAqCAMIACAQExDzANBglghkgBZQMEAgEFAD…ZuQFfsLJ+Nb3+7bpjfBsZAhA1sIT1XmHoGFdoCUT3AAAAAAAA',
          header: {
            ephemeralPublicKey: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE5/Qc6z4TY5HQ5n…KC3kJ4DtIWedPQ70N35PBZzJUrFjtvDZFUvs80uo2ynu+lw==',
            publicKeyHash: 'Xzn7W3vsrlKlb0QvUAviASubdtW4BotWrDo5mGG+UWY=',
            transactionId: '372c3858122b6bc39c6095eca2f994a8aa012f3b025d0d72ecfd449c2a5877f9'
          }
        },
        paymentMethod: {
          displayName: 'MasterCard 1358',
          network: 'MasterCard',
          type: 'debit'
        },
        transactionIdentifier: '372C3858122B6BC39C6095ECA2F994A8AA012F3B025D0D72ECFD449C2A5877F9'
      }
    }
    const normalisedPayload = normalise({ body: applePayPayload })
    expect(normalisedPayload).to.eql(
      {
        payment_info: {
          last_digits_card_number: '1358',
          brand: 'master-card',
          card_type: 'DEBIT',
          cardholder_name: null,
          email: null,
          display_name: 'MasterCard 1358',
          network: 'MasterCard',
          transaction_identifier: '372C3858122B6BC39C6095ECA2F994A8AA012F3B025D0D72ECFD449C2A5877F9'
        },
        payment_data: '{"version":"EC_v1","data":"MLHhOn2BXhNw9wLLDR48DyeUcuSmRJ6KnAIGTMGqsgiMpc+AoJ…LUQ6UovkfSnW0sFH6NGZ0jhoap6LYnThYb9WT6yKfEm/rDhM=","signature":"MIAGCSqGSIb3DQEHAqCAMIACAQExDzANBglghkgBZQMEAgEFAD…ZuQFfsLJ+Nb3+7bpjfBsZAhA1sIT1XmHoGFdoCUT3AAAAAAAA","header":{"ephemeralPublicKey":"MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE5/Qc6z4TY5HQ5n…KC3kJ4DtIWedPQ70N35PBZzJUrFjtvDZFUvs80uo2ynu+lw==","publicKeyHash":"Xzn7W3vsrlKlb0QvUAviASubdtW4BotWrDo5mGG+UWY=","transactionId":"372c3858122b6bc39c6095eca2f994a8aa012f3b025d0d72ecfd449c2a5877f9"}}'
      }
    )

    const loggingPayload = {
      selected_payload_properties:
        {
          token: {
            paymentMethod: {
              displayName: 'MasterCard 1358',
              network: 'MasterCard',
              type: 'debit'
            }
          }
        }
    }

    sinon.assert.calledWithExactly(loggerInfoMock, 'Received Apple Pay payload', loggingPayload)
  })
})
