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

const normalise = proxyquire('../../../../app/controllers/web-payments/google-pay/normalise-google-pay-payload.js',
  proxyquireMocks)

const headers = {
  'accept-for-html': 'text/html;q=1.0, */*;q=0.9',
  'user-agent': 'Mozilla/5.0',
  'x-forwarded-for': '203.0.113.1'
}

describe('normalise Google Pay payload', () => {
  it('should return the correct format for the payload', () => {
    const googlePayPayload = {
      paymentResponse: {
        details: {
          apiVersionMinor: 0,
          apiVersion: 2,
          paymentMethodData: {
            description: 'Mastercard •••• 4242',
            info: {
              cardNetwork: 'MASTERCARD',
              cardDetails: '4242'
            },
            tokenizationData: {
              type: 'PAYMENT_GATEWAY',
              token: '{"signature":"MEQCIB54h8T/hWY3864Ufkwo4SF5IjhoMV9hjpJRIsqbAn4LAiBZz1VBZ+aiaduX8MN3dBtzyDOZVstwG/8bqJZDbrhKfQ\\u003d","protocolVersion":"ECv1","signedMessage":"{\\"encryptedMessage\\":\\"I2fg4rbEzgRHpvJqN4pHa7Zh93eGePLCKwHljtTfgWELsLOx0Or1cBQ6giKNUrJza3DqhS0AO+Qoar44J2HBryMRaiuSIi/un0zsNV9cfmiLSHNjHNnATkYrfY4u/Or2uSeuAaxLEt3d91NhHWKqf6BelNme182onG23GvOqd4RAukUW7RJ04eouaCIvBisdt866uq/9B3jJb0QiT91ifZ8C/bfScnBFPL4AX0X3G+B7418wSTtUYrMVBnyhNJS8T2Aw9oW8s7c9pra4PI9cHfcu22opRxzSS9snBF39uTwk8c+Pjj3G8yfNI0biDkHNAUiA1YuBW5CgHeJZ/FhayAsAPzfMmI4qei9nTzIEPlDkkGsqFnamCYIg8N9SM51YV8NGS0MQTIYmJg3GHl2D/We30D6dvYSWfLDDJNATAgb3l+4powoxogb28cwE9vLjFhOF/GChrGRpM845E9r1q0tNfg\\\\u003d\\\\u003d\\",\\"ephemeralPublicKey\\":\\"BC9B7aoVhvPzR54m8P1CkGFDSyuxl04iqu22SvnrlLgZEoH3EvpBNKPyMS/nLIe3mJ+cw26GglqMs00B7EEEs0I\\\\u003d\\",\\"tag\\":\\"lOylJZZF3xdVpsqpl5bKgZdsxRPetMRvcKu9WnmFQ/k\\\\u003d\\"}"}'
            },
            type: 'CARD'
          }
        },
        payerEmail: 'name@email.test',
        payerName: 'Some Name'
      },
      worldpay3dsFlexDdcStatus: 'valid DDC result',
      worldpay3dsFlexDdcResult: 'some long opaque string that’s a device data collection result'
    }

    const normalisedPayload = normalise({ headers: headers, body: googlePayPayload })
    expect(normalisedPayload).to.eql(
      {
        payment_info: {
          last_digits_card_number: '4242',
          brand: 'master-card',
          cardholder_name: 'Some Name',
          email: 'name@email.test',
          worldpay_3ds_flex_ddc_result: 'some long opaque string that’s a device data collection result',
          accept_header: 'text/html;q=1.0, */*;q=0.9',
          user_agent_header: 'Mozilla/5.0',
          ip_address: '203.0.113.1'
        },
        encrypted_payment_data: {
          signature: 'MEQCIB54h8T/hWY3864Ufkwo4SF5IjhoMV9hjpJRIsqbAn4LAiBZz1VBZ+aiaduX8MN3dBtzyDOZVstwG/8bqJZDbrhKfQ=',
          protocol_version: 'ECv1',
          signed_message: '{"encryptedMessage":"I2fg4rbEzgRHpvJqN4pHa7Zh93eGePLCKwHljtTfgWELsLOx0Or1cBQ6giKNUrJza3DqhS0AO+Qoar44J2HBryMRaiuSIi/un0zsNV9cfmiLSHNjHNnATkYrfY4u/Or2uSeuAaxLEt3d91NhHWKqf6BelNme182onG23GvOqd4RAukUW7RJ04eouaCIvBisdt866uq/9B3jJb0QiT91ifZ8C/bfScnBFPL4AX0X3G+B7418wSTtUYrMVBnyhNJS8T2Aw9oW8s7c9pra4PI9cHfcu22opRxzSS9snBF39uTwk8c+Pjj3G8yfNI0biDkHNAUiA1YuBW5CgHeJZ/FhayAsAPzfMmI4qei9nTzIEPlDkkGsqFnamCYIg8N9SM51YV8NGS0MQTIYmJg3GHl2D/We30D6dvYSWfLDDJNATAgb3l+4powoxogb28cwE9vLjFhOF/GChrGRpM845E9r1q0tNfg\\u003d\\u003d","ephemeralPublicKey":"BC9B7aoVhvPzR54m8P1CkGFDSyuxl04iqu22SvnrlLgZEoH3EvpBNKPyMS/nLIe3mJ+cw26GglqMs00B7EEEs0I\\u003d","tag":"lOylJZZF3xdVpsqpl5bKgZdsxRPetMRvcKu9WnmFQ/k\\u003d"}'
        }
      }
    )

    const loggingPayload = {
      selected_payload_properties:
        {
          paymentResponse: {
            details: {
              paymentMethodData: {
                info: {
                  cardDetails: '4242',
                  cardNetwork: 'MASTERCARD'
                }
              }
            },
            payerName: '(redacted non-blank string)',
            payerEmail: '(redacted non-blank string)'
          },
          worldpay3dsFlexDdcResult: '(redacted non-blank string)'

        }
    }

    sinon.assert.calledWithExactly(loggerInfoMock, 'Received Google Pay payload', loggingPayload)
  })

  it('should throw error for invalid the payload', () => {
    const googlePayPayload = {
      paymentResponse: {
        details: {
          apiVersionMinor: 0,
          apiVersion: 2,
          paymentMethodData: {
            description: 'UnSupported card •••• 4242',
            info: {
              cardNetwork: 'UnSupportedCard',
              cardDetails: '4242'
            },
            tokenizationData: {
              type: 'PAYMENT_GATEWAY',
              token: '{"signature":"MEQCIB54h8T/hWY3864Ufkwo4SF5IjhoMV9hjpJRIsqbAn4LAiBZz1VBZ+aiaduX8MN3dBtzyDOZVstwG/8bqJZDbrhKfQ\\u003d","protocolVersion":"ECv1","signedMessage":"{\\"encryptedMessage\\":\\"I2fg4rbEzgRHpvJqN4pHa7Zh93eGePLCKwHljtTfgWELsLOx0Or1cBQ6giKNUrJza3DqhS0AO+Qoar44J2HBryMRaiuSIi/un0zsNV9cfmiLSHNjHNnATkYrfY4u/Or2uSeuAaxLEt3d91NhHWKqf6BelNme182onG23GvOqd4RAukUW7RJ04eouaCIvBisdt866uq/9B3jJb0QiT91ifZ8C/bfScnBFPL4AX0X3G+B7418wSTtUYrMVBnyhNJS8T2Aw9oW8s7c9pra4PI9cHfcu22opRxzSS9snBF39uTwk8c+Pjj3G8yfNI0biDkHNAUiA1YuBW5CgHeJZ/FhayAsAPzfMmI4qei9nTzIEPlDkkGsqFnamCYIg8N9SM51YV8NGS0MQTIYmJg3GHl2D/We30D6dvYSWfLDDJNATAgb3l+4powoxogb28cwE9vLjFhOF/GChrGRpM845E9r1q0tNfg\\\\u003d\\\\u003d\\",\\"ephemeralPublicKey\\":\\"BC9B7aoVhvPzR54m8P1CkGFDSyuxl04iqu22SvnrlLgZEoH3EvpBNKPyMS/nLIe3mJ+cw26GglqMs00B7EEEs0I\\\\u003d\\",\\"tag\\":\\"lOylJZZF3xdVpsqpl5bKgZdsxRPetMRvcKu9WnmFQ/k\\\\u003d\\"}"}'
            },
            type: 'CARD'
          }
        },
        payerEmail: 'name@email.test',
        payerName: 'Some Name'
      }
    }

    expect(() => normalise({
      headers: headers,
      body: googlePayPayload
    })).to.throw('Unrecognised card brand in Google Pay payload: UnSupportedCard')
  })

  it('should throw error if card brand is not available', () => {
    const googlePayPayload = {
      paymentResponse: {
        details: {
          apiVersionMinor: 0,
          apiVersion: 2,
          paymentMethodData: {
            description: 'UnSupported card •••• 4242',
            info: {
              cardDetails: '4242'
            },
            tokenizationData: {
              type: 'PAYMENT_GATEWAY',
              token: '{"signature":"MEQCIB54h8T/hWY3864Ufkwo4SF5IjhoMV9hjpJRIsqbAn4LAiBZz1VBZ+aiaduX8MN3dBtzyDOZVstwG/8bqJZDbrhKfQ\\u003d","protocolVersion":"ECv1","signedMessage":"{\\"encryptedMessage\\":\\"I2fg4rbEzgRHpvJqN4pHa7Zh93eGePLCKwHljtTfgWELsLOx0Or1cBQ6giKNUrJza3DqhS0AO+Qoar44J2HBryMRaiuSIi/un0zsNV9cfmiLSHNjHNnATkYrfY4u/Or2uSeuAaxLEt3d91NhHWKqf6BelNme182onG23GvOqd4RAukUW7RJ04eouaCIvBisdt866uq/9B3jJb0QiT91ifZ8C/bfScnBFPL4AX0X3G+B7418wSTtUYrMVBnyhNJS8T2Aw9oW8s7c9pra4PI9cHfcu22opRxzSS9snBF39uTwk8c+Pjj3G8yfNI0biDkHNAUiA1YuBW5CgHeJZ/FhayAsAPzfMmI4qei9nTzIEPlDkkGsqFnamCYIg8N9SM51YV8NGS0MQTIYmJg3GHl2D/We30D6dvYSWfLDDJNATAgb3l+4powoxogb28cwE9vLjFhOF/GChrGRpM845E9r1q0tNfg\\\\u003d\\\\u003d\\",\\"ephemeralPublicKey\\":\\"BC9B7aoVhvPzR54m8P1CkGFDSyuxl04iqu22SvnrlLgZEoH3EvpBNKPyMS/nLIe3mJ+cw26GglqMs00B7EEEs0I\\\\u003d\\",\\"tag\\":\\"lOylJZZF3xdVpsqpl5bKgZdsxRPetMRvcKu9WnmFQ/k\\\\u003d\\"}"}'
            },
            type: 'CARD'
          }
        },
        payerEmail: 'name@email.test',
        payerName: 'Some Name'
      }
    }

    expect(() => normalise({
      headers: headers,
      body: googlePayPayload
    })).to.throw('Card brand is not available in Google Pay payload')
  })

  it('should return the correct format for the payload with min data', () => {
    const googlePayPayload = {
      paymentResponse: {
        details: {
          apiVersionMinor: 0,
          apiVersion: 2,
          paymentMethodData: {
            description: 'Mastercard •••• 4242',
            info: {
              cardNetwork: 'MASTERCARD',
              cardDetails: '4242'
            },
            tokenizationData: {
              type: 'PAYMENT_GATEWAY',
              token: '{"signature":"MEQCIB54h8T/hWY3864Ufkwo4SF5IjhoMV9hjpJRIsqbAn4LAiBZz1VBZ+aiaduX8MN3dBtzyDOZVstwG/8bqJZDbrhKfQ\\u003d","protocolVersion":"ECv1","signedMessage":"{\\"encryptedMessage\\":\\"I2fg4rbEzgRHpvJqN4pHa7Zh93eGePLCKwHljtTfgWELsLOx0Or1cBQ6giKNUrJza3DqhS0AO+Qoar44J2HBryMRaiuSIi/un0zsNV9cfmiLSHNjHNnATkYrfY4u/Or2uSeuAaxLEt3d91NhHWKqf6BelNme182onG23GvOqd4RAukUW7RJ04eouaCIvBisdt866uq/9B3jJb0QiT91ifZ8C/bfScnBFPL4AX0X3G+B7418wSTtUYrMVBnyhNJS8T2Aw9oW8s7c9pra4PI9cHfcu22opRxzSS9snBF39uTwk8c+Pjj3G8yfNI0biDkHNAUiA1YuBW5CgHeJZ/FhayAsAPzfMmI4qei9nTzIEPlDkkGsqFnamCYIg8N9SM51YV8NGS0MQTIYmJg3GHl2D/We30D6dvYSWfLDDJNATAgb3l+4powoxogb28cwE9vLjFhOF/GChrGRpM845E9r1q0tNfg\\\\u003d\\\\u003d\\",\\"ephemeralPublicKey\\":\\"BC9B7aoVhvPzR54m8P1CkGFDSyuxl04iqu22SvnrlLgZEoH3EvpBNKPyMS/nLIe3mJ+cw26GglqMs00B7EEEs0I\\\\u003d\\",\\"tag\\":\\"lOylJZZF3xdVpsqpl5bKgZdsxRPetMRvcKu9WnmFQ/k\\\\u003d\\"}"}'
            },
            type: 'CARD'
          }
        }
      }
    }
    const normalisedPayload = normalise({ headers: headers, body: googlePayPayload })
    expect(normalisedPayload).to.eql(
      {
        payment_info: {
          last_digits_card_number: '4242',
          brand: 'master-card',
          cardholder_name: null,
          email: null,
          worldpay_3ds_flex_ddc_result: null,
          accept_header: 'text/html;q=1.0, */*;q=0.9',
          user_agent_header: 'Mozilla/5.0',
          ip_address: '203.0.113.1'
        },
        encrypted_payment_data: {
          signature: 'MEQCIB54h8T/hWY3864Ufkwo4SF5IjhoMV9hjpJRIsqbAn4LAiBZz1VBZ+aiaduX8MN3dBtzyDOZVstwG/8bqJZDbrhKfQ=',
          protocol_version: 'ECv1',
          signed_message: '{"encryptedMessage":"I2fg4rbEzgRHpvJqN4pHa7Zh93eGePLCKwHljtTfgWELsLOx0Or1cBQ6giKNUrJza3DqhS0AO+Qoar44J2HBryMRaiuSIi/un0zsNV9cfmiLSHNjHNnATkYrfY4u/Or2uSeuAaxLEt3d91NhHWKqf6BelNme182onG23GvOqd4RAukUW7RJ04eouaCIvBisdt866uq/9B3jJb0QiT91ifZ8C/bfScnBFPL4AX0X3G+B7418wSTtUYrMVBnyhNJS8T2Aw9oW8s7c9pra4PI9cHfcu22opRxzSS9snBF39uTwk8c+Pjj3G8yfNI0biDkHNAUiA1YuBW5CgHeJZ/FhayAsAPzfMmI4qei9nTzIEPlDkkGsqFnamCYIg8N9SM51YV8NGS0MQTIYmJg3GHl2D/We30D6dvYSWfLDDJNATAgb3l+4powoxogb28cwE9vLjFhOF/GChrGRpM845E9r1q0tNfg\\u003d\\u003d","ephemeralPublicKey":"BC9B7aoVhvPzR54m8P1CkGFDSyuxl04iqu22SvnrlLgZEoH3EvpBNKPyMS/nLIe3mJ+cw26GglqMs00B7EEEs0I\\u003d","tag":"lOylJZZF3xdVpsqpl5bKgZdsxRPetMRvcKu9WnmFQ/k\\u003d"}'
        }
      }
    )

    const loggingPayload = {
      selected_payload_properties:
        {
          paymentResponse: {
            details: {
              paymentMethodData: {
                info: {
                  cardDetails: '4242',
                  cardNetwork: 'MASTERCARD'
                }
              }
            }
          }
        }
    }

    sinon.assert.calledWithExactly(loggerInfoMock, 'Received Google Pay payload', loggingPayload)
  })

  it('should return an empty string for last_digits_card_number when cardDetails does not have numeric values for the last 4 characters', () => {
    const googlePayPayload = {
      paymentResponse: {
        details: {
          apiVersionMinor: 0,
          apiVersion: 2,
          paymentMethodData: {
            description: 'Mastercard •••• ABCD',
            info: {
              cardNetwork: 'MASTERCARD',
              cardDetails: 'ABCD'
            },
            tokenizationData: {
              type: 'PAYMENT_GATEWAY',
              token: '{"signature":"MEQCIB54h8T/hWY3864Ufkwo4SF5IjhoMV9hjpJRIsqbAn4LAiBZz1VBZ+aiaduX8MN3dBtzyDOZVstwG/8bqJZDbrhKfQ\\u003d","protocolVersion":"ECv1","signedMessage":"{\\"encryptedMessage\\":\\"I2fg4rbEzgRHpvJqN4pHa7Zh93eGePLCKwHljtTfgWELsLOx0Or1cBQ6giKNUrJza3DqhS0AO+Qoar44J2HBryMRaiuSIi/un0zsNV9cfmiLSHNjHNnATkYrfY4u/Or2uSeuAaxLEt3d91NhHWKqf6BelNme182onG23GvOqd4RAukUW7RJ04eouaCIvBisdt866uq/9B3jJb0QiT91ifZ8C/bfScnBFPL4AX0X3G+B7418wSTtUYrMVBnyhNJS8T2Aw9oW8s7c9pra4PI9cHfcu22opRxzSS9snBF39uTwk8c+Pjj3G8yfNI0biDkHNAUiA1YuBW5CgHeJZ/FhayAsAPzfMmI4qei9nTzIEPlDkkGsqFnamCYIg8N9SM51YV8NGS0MQTIYmJg3GHl2D/We30D6dvYSWfLDDJNATAgb3l+4powoxogb28cwE9vLjFhOF/GChrGRpM845E9r1q0tNfg\\\\u003d\\\\u003d\\",\\"ephemeralPublicKey\\":\\"BC9B7aoVhvPzR54m8P1CkGFDSyuxl04iqu22SvnrlLgZEoH3EvpBNKPyMS/nLIe3mJ+cw26GglqMs00B7EEEs0I\\\\u003d\\",\\"tag\\":\\"lOylJZZF3xdVpsqpl5bKgZdsxRPetMRvcKu9WnmFQ/k\\\\u003d\\"}"}'
            },
            type: 'CARD'
          }
        }
      }
    }
    const normalisedPayload = normalise({ headers: headers, body: googlePayPayload })
    expect(normalisedPayload).to.eql(
      {
        payment_info: {
          last_digits_card_number: '',
          brand: 'master-card',
          cardholder_name: null,
          email: null,
          worldpay_3ds_flex_ddc_result: null,
          accept_header: 'text/html;q=1.0, */*;q=0.9',
          user_agent_header: 'Mozilla/5.0',
          ip_address: '203.0.113.1'
        },
        encrypted_payment_data: {
          signature: 'MEQCIB54h8T/hWY3864Ufkwo4SF5IjhoMV9hjpJRIsqbAn4LAiBZz1VBZ+aiaduX8MN3dBtzyDOZVstwG/8bqJZDbrhKfQ=',
          protocol_version: 'ECv1',
          signed_message: '{"encryptedMessage":"I2fg4rbEzgRHpvJqN4pHa7Zh93eGePLCKwHljtTfgWELsLOx0Or1cBQ6giKNUrJza3DqhS0AO+Qoar44J2HBryMRaiuSIi/un0zsNV9cfmiLSHNjHNnATkYrfY4u/Or2uSeuAaxLEt3d91NhHWKqf6BelNme182onG23GvOqd4RAukUW7RJ04eouaCIvBisdt866uq/9B3jJb0QiT91ifZ8C/bfScnBFPL4AX0X3G+B7418wSTtUYrMVBnyhNJS8T2Aw9oW8s7c9pra4PI9cHfcu22opRxzSS9snBF39uTwk8c+Pjj3G8yfNI0biDkHNAUiA1YuBW5CgHeJZ/FhayAsAPzfMmI4qei9nTzIEPlDkkGsqFnamCYIg8N9SM51YV8NGS0MQTIYmJg3GHl2D/We30D6dvYSWfLDDJNATAgb3l+4powoxogb28cwE9vLjFhOF/GChrGRpM845E9r1q0tNfg\\u003d\\u003d","ephemeralPublicKey":"BC9B7aoVhvPzR54m8P1CkGFDSyuxl04iqu22SvnrlLgZEoH3EvpBNKPyMS/nLIe3mJ+cw26GglqMs00B7EEEs0I\\u003d","tag":"lOylJZZF3xdVpsqpl5bKgZdsxRPetMRvcKu9WnmFQ/k\\u003d"}'
        }
      }
    )
  })

  it('should return an empty string for last_digits_card_number when cardDetails is a blank string', () => {
    const googlePayPayload = {
      paymentResponse: {
        details: {
          apiVersionMinor: 0,
          apiVersion: 2,
          paymentMethodData: {
            description: 'cardDetails blank str',
            info: {
              cardNetwork: 'MASTERCARD',
              cardDetails: ''
            },
            tokenizationData: {
              type: 'PAYMENT_GATEWAY',
              token: '{"signature":"MEQCIB54h8T/hWY3864Ufkwo4SF5IjhoMV9hjpJRIsqbAn4LAiBZz1VBZ+aiaduX8MN3dBtzyDOZVstwG/8bqJZDbrhKfQ\\u003d","protocolVersion":"ECv1","signedMessage":"{\\"encryptedMessage\\":\\"I2fg4rbEzgRHpvJqN4pHa7Zh93eGePLCKwHljtTfgWELsLOx0Or1cBQ6giKNUrJza3DqhS0AO+Qoar44J2HBryMRaiuSIi/un0zsNV9cfmiLSHNjHNnATkYrfY4u/Or2uSeuAaxLEt3d91NhHWKqf6BelNme182onG23GvOqd4RAukUW7RJ04eouaCIvBisdt866uq/9B3jJb0QiT91ifZ8C/bfScnBFPL4AX0X3G+B7418wSTtUYrMVBnyhNJS8T2Aw9oW8s7c9pra4PI9cHfcu22opRxzSS9snBF39uTwk8c+Pjj3G8yfNI0biDkHNAUiA1YuBW5CgHeJZ/FhayAsAPzfMmI4qei9nTzIEPlDkkGsqFnamCYIg8N9SM51YV8NGS0MQTIYmJg3GHl2D/We30D6dvYSWfLDDJNATAgb3l+4powoxogb28cwE9vLjFhOF/GChrGRpM845E9r1q0tNfg\\\\u003d\\\\u003d\\",\\"ephemeralPublicKey\\":\\"BC9B7aoVhvPzR54m8P1CkGFDSyuxl04iqu22SvnrlLgZEoH3EvpBNKPyMS/nLIe3mJ+cw26GglqMs00B7EEEs0I\\\\u003d\\",\\"tag\\":\\"lOylJZZF3xdVpsqpl5bKgZdsxRPetMRvcKu9WnmFQ/k\\\\u003d\\"}"}'
            },
            type: 'CARD'
          }
        }
      }
    }
    const normalisedPayload = normalise({ headers: headers, body: googlePayPayload })
    expect(normalisedPayload).to.eql(
      {
        payment_info: {
          last_digits_card_number: '',
          brand: 'master-card',
          cardholder_name: null,
          email: null,
          worldpay_3ds_flex_ddc_result: null,
          accept_header: 'text/html;q=1.0, */*;q=0.9',
          user_agent_header: 'Mozilla/5.0',
          ip_address: '203.0.113.1'
        },
        encrypted_payment_data: {
          signature: 'MEQCIB54h8T/hWY3864Ufkwo4SF5IjhoMV9hjpJRIsqbAn4LAiBZz1VBZ+aiaduX8MN3dBtzyDOZVstwG/8bqJZDbrhKfQ=',
          protocol_version: 'ECv1',
          signed_message: '{"encryptedMessage":"I2fg4rbEzgRHpvJqN4pHa7Zh93eGePLCKwHljtTfgWELsLOx0Or1cBQ6giKNUrJza3DqhS0AO+Qoar44J2HBryMRaiuSIi/un0zsNV9cfmiLSHNjHNnATkYrfY4u/Or2uSeuAaxLEt3d91NhHWKqf6BelNme182onG23GvOqd4RAukUW7RJ04eouaCIvBisdt866uq/9B3jJb0QiT91ifZ8C/bfScnBFPL4AX0X3G+B7418wSTtUYrMVBnyhNJS8T2Aw9oW8s7c9pra4PI9cHfcu22opRxzSS9snBF39uTwk8c+Pjj3G8yfNI0biDkHNAUiA1YuBW5CgHeJZ/FhayAsAPzfMmI4qei9nTzIEPlDkkGsqFnamCYIg8N9SM51YV8NGS0MQTIYmJg3GHl2D/We30D6dvYSWfLDDJNATAgb3l+4powoxogb28cwE9vLjFhOF/GChrGRpM845E9r1q0tNfg\\u003d\\u003d","ephemeralPublicKey":"BC9B7aoVhvPzR54m8P1CkGFDSyuxl04iqu22SvnrlLgZEoH3EvpBNKPyMS/nLIe3mJ+cw26GglqMs00B7EEEs0I\\u003d","tag":"lOylJZZF3xdVpsqpl5bKgZdsxRPetMRvcKu9WnmFQ/k\\u003d"}'
        }
      }
    )
  })
})
