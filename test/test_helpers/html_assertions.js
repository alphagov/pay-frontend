// NPM dependencies
const cheerio = require('cheerio')
const chai = require('chai')
const nunjucks = require('nunjucks')
const lodash = require('lodash')

// Global initialisation
const views = ['./app/views', './node_modules/govuk-frontend']
const environment = nunjucks.configure(views)
const strings = require('./../../locales/en.json')

// Shim for i18n to make it recognise the `__p()`` and `__()` function and return the English string
environment.addGlobal('__p', string => {
  return lodash.get(strings, string)
})

environment.addGlobal('__', string => {
  return lodash.get(strings, string)
})

module.exports = {
  render: render
}

function render (templateName, templateData) {
  const pathToTemplate = templateName + '.njk'

  return environment.render(pathToTemplate, templateData)
}

chai.use(function (_chai, utils) {
  // See http://chaijs.com/guide/plugins/ and http://chaijs.com/guide/helpers/

  // Flags:
  // rawHtml: The raw html passed into containSelector
  // obj: Cheerio parsed rawHtml.
  // inputFieldId: The input field id of the last containInputField call.

  chai.Assertion.addMethod('containSelector', function (selector) {
    utils.flag(this, 'rawHtml', this._obj)
    const $ = cheerio.load(this._obj)
    const result = $(selector)
    this.assert(result.length > 0,
      'Expected #{this} to contain \'' + selector + '\'',
      'Did not expect #{this} to contain \'' + selector + '\''
    )
    this._obj = result
  })

  chai.Assertion.addMethod('withText', function (msg) {
    const actual = this._obj.length > 1 ? this._obj.toString() : this._obj.text()
    this.assert(actual.indexOf(msg) > -1,
      'Expected #{act} to contain \'' + msg + '\'.',
      'Did not expect #{act} to contain \'' + msg + '\'.',
      msg,
      actual
    )
  })

  chai.Assertion.addMethod('withAttribute', function (expectedAttr, expectedValue) {
    this.assert(this._obj.attr(expectedAttr) !== undefined,
      'Expected #{act} to contain \'' + expectedAttr + '\'',
      'Did not expect #{act} to contain \'' + expectedAttr + '\'',
      expectedAttr,
      JSON.stringify(this._obj['0'].attribs)
    )

    if (arguments.length === 2) {
      this.assert(this._obj.attr(expectedAttr) === expectedValue,
        'Expected #{act} to contain \'' + expectedAttr + '\' with value \'' + expectedValue + '\'',
        'Did not expect #{act} to contain \'' + expectedAttr + '\' with value \'' + expectedValue + '\'',
        expectedAttr,
        JSON.stringify(this._obj['0'].attribs)
      )
    }
  })

  chai.Assertion.addMethod('withAttributes', function (attributes) {
    for (const attr in attributes) {
      if (attributes.hasOwnProperty(attr)) { // eslint-disable-line
        this.withAttribute(attr, attributes[attr])
      }
    }
  })

  chai.Assertion.addMethod('containInputField', function (idAndName, type) {
    this.containSelector('input#' + idAndName).withAttributes({ name: idAndName, type: type })
    utils.flag(this, 'inputFieldId', idAndName)
  })

  chai.Assertion.addMethod('containInputWithIdAndName', function (id, name, type) {
    this.containSelector('input#' + id).withAttributes({ name: name, type: type })
    utils.flag(this, 'inputFieldId', id)
  })

  chai.Assertion.addMethod('withLabel', function (labelId, labelText) {
    const inputFieldId = utils.flag(this, 'inputFieldId')
    const subAssertion = new chai.Assertion(utils.flag(this, 'rawHtml'))
    subAssertion.containSelector('label#' + labelId).withAttribute('for', inputFieldId)
  })
})
