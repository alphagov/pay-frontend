const path = require('path')
const TemplateEngine = require(path.join(__dirname, '/../../lib/template-engine.js'))

const chai = require('chai')
const expect = chai.expect

const dirViews = path.join(__dirname, '/../../app/views')
const dirVendorViews = path.join(__dirname, '/../../govuk_modules/govuk_template/views/layouts')

describe('template engine', function () {
  it('should render a template without errors', function (done) {
    const templatePath = path.join(__dirname, '/../../app/views/charge.html')
    const templateData = JSON.parse(`{"settings": {"views": "${encodeURI(dirViews)}","vendorViews": "${encodeURI(dirVendorViews)}"}}`)
    TemplateEngine.__express(templatePath, templateData, function (error, output) {
      expect(error).to.be.null // eslint-disable-line
      expect(output).to.not.be.null // eslint-disable-line
      done()
    })
  })
  it('should return an error for an invalid configuration', function (done) {
    const invalidTemplateData = JSON.parse(`{"settings": {"views": "${encodeURI(dirViews)}","vendorViews": "${encodeURI(dirVendorViews)}"}}`)
    TemplateEngine.__express('', invalidTemplateData, function (error, output) {
      expect(output).to.be.null // eslint-disable-line
      expect(error).to.not.be.null // eslint-disable-line
      done()
    })
  })
})
