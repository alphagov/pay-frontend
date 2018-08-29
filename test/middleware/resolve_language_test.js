// NPM dependencies
const path = require('path')
const i18n = require('i18n')
const assert = require('assert')

// local dependencies
const resolveLanguage = require('../../app/middleware/resolve_language.js')

// local constants
const res = {
  locals: {}
}

describe('Resolve language from Charge object', function () {
  beforeEach(function () {
    i18n.configure({
      locales: ['en', 'cy'],
      directory: path.join(__dirname, '../../locales'),
      objectNotation: true,
      defaultLocale: 'en',
      register: global
    })
  })

  describe('If language is set to English', function () {
    const req = {
      chargeData: {
        language: 'en'
      }
    }

    it('should set language and use English strings', function (done) {
      resolveLanguage(req, res, function () {
        assert(res.locals.language === req.chargeData.language)
        const strings = JSON.parse(res.locals.translationStrings)
        assert(strings.cardDetails.title === 'Enter card details')
        done()
      })
    })
  })

  describe('If no language is set', function () {
    const req = {
      chargeData: {
      }
    }

    it('should default to English', function (done) {
      resolveLanguage(req, res, function () {
        assert(res.locals.language === 'en')
        const strings = JSON.parse(res.locals.translationStrings)
        assert(strings.cardDetails.title === 'Enter card details')
        done()
      })
    })
  })

  describe('If language is set to Welsh', function () {
    const req = {
      chargeData: {
        language: 'cy'
      }
    }

    it('should set language and use Welsh strings', function (done) {
      resolveLanguage(req, res, function () {
        assert(res.locals.language === req.chargeData.language)
        const strings = JSON.parse(res.locals.translationStrings)
        assert(strings.cardDetails.title === 'Rhowch fanylion y cerdyn')
        done()
      })
    })
  })
})
