'use strict'

global.window = {
  Card: {},
  Charge: {}
}

const { shortenGooglePayDescription } = require('../../../../app/assets/javascripts/browsered/web-payments/google-pay')
const { expect } = require('chai')

const STRING_17_CHAR_LENGTH = 'abcdefghijklmnopq'
const STRING_18_CHAR_LENGTH = 'abcdefghijklmnopqr'
const STRING_19_CHAR_LENGTH = 'abcdefghijklmnopqrs'

describe.only('Google Pay', () => {
  describe('shorten payment description for Google pay', () => {
    it('should return the original description when the length < 18', () => {
      expect(shortenGooglePayDescription(STRING_17_CHAR_LENGTH)).to.equal(STRING_17_CHAR_LENGTH)
    })

    it('should return the original description when length = 18', () => {
      expect(shortenGooglePayDescription(STRING_18_CHAR_LENGTH)).to.equal(STRING_18_CHAR_LENGTH)
    })

    it('should tuncate the description to 17 characters and add the elipses character when length > 18', () => {
      expect(shortenGooglePayDescription(STRING_19_CHAR_LENGTH)).to.equal('abcdefghijklmnopq…')
    })
  })
})
