const decryptCardDetails = require('../../app/middleware/decrypt_card_details.js')
const { expect } = require('chai')
const sinon = require('sinon')

const decryptedCardDetails = {
  cardNo: 'something',
  cvc: 'cvc value',
  addressPostcode: 'address postcode',
  expiryYear: 'expiry yeah',
  expiryMonth: 'expiry month'
}

const encryptValue = (value) => {
  return 'encrypted' + value
}

describe.only('When CLOUDFRONT_PRIVATE_KEY is true', function () {
  const next = sinon.spy()

  it('should decrypt cardNo', () => {
    const encryptedCardDetails = Object.keys(decryptedCardDetails).reduce( (encryptedMap, key) => {
      encryptedMap[key] = encryptValue(decryptedCardDetails[key])
      return encryptedMap
    }, {})

    const request = {
      body: encryptedCardDetails
    }

    process.env.CLOUDFRONT_PRIVATE_KEY = 'true'
    decryptCardDetails(request, {}, next)
    expect(next.called).to.be.true
    console.log(request.body)
    expect(request.body).to.deep.equal(decryptedCardDetails)
  })
})

describe.only('When CLOUDFRONT_PRIVATE_KEY is not set', function () {
  const next = sinon.spy()

  it('should not decrypt cardNo', () => {
    const request = {
      body: decryptedCardDetails
    }

    process.env.CLOUDFRONT_PRIVATE_KEY=''
    decryptCardDetails(request, {}, next)
    expect(next.called).to.be.true
    expect(request.body).to.equal(decryptedCardDetails)
  })
})
