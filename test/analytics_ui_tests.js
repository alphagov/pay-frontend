var path = require('path')
var renderTemplate = require(path.join(__dirname, '/test_helpers/html_assertions.js')).render
var should = require('chai').should() // eslint-disable-line

describe('Frontend analytics', function () {
  var googleAnalyticsScript = '//www.google-analytics.com/analytics.js'
  var googleAnalyticsCustomDimensions = {
    'analyticsId': 'testId',
    'type': 'testType',
    'paymentProvider': 'paymentProvider'
  }

  var checkGACustomDimensions = function (body) {
    body.should.containSelector('script').withText("'dimension1':'testId'")
    body.should.containSelector('script').withText("'dimension2':'testType'")
    body.should.containSelector('script').withText("'dimension3':'paymentProvider'")
  }

  it('should be enabled in charge view', function (done) {
    var templateData = {
      'amount': '50.00',
      'analytics': googleAnalyticsCustomDimensions
    }
    renderTemplate('charge', templateData, function (err, body) {
      if (err) done(err)
      body.should.containSelector('script').withText(googleAnalyticsScript)
      checkGACustomDimensions(body)
      done()
    })
  })

  it('should be enabled in confirm view', function (done) {
    var templateData = {
      'cardNumber': '************5100',
      'expiryDate': '11/99',
      'amount': '10.00',
      'description': 'Payment Description',
      'cardholderName': 'Random dude',
      'address': '1 street lane, avenue city, AB1 3DF',
      'serviceName': 'Service 1',
      'analytics': googleAnalyticsCustomDimensions
    }

    renderTemplate('confirm', templateData, function (err, body) {
      if (err) done(err)
      body.should.containSelector('script').withText(googleAnalyticsScript)
      checkGACustomDimensions(body)
      done()
    })
  })

  it('should be enabled in error view', function (done) {
    var msg = 'error processing your payment!'
    renderTemplate('error', {
      'message': msg,
      'analytics': googleAnalyticsCustomDimensions
    }, function (err, body) {
      if (err) done(err)
      body.should.containSelector('script').withText(googleAnalyticsScript)
      checkGACustomDimensions(body)
      done()
    })
  })

  it('should be enabled in error with return url view', function (done) {
    var msg = 'error processing your payment!'
    var returnUrl = 'http://some.return.url'
    renderTemplate('error_with_return_url', {
      'message': msg,
      'return_url': returnUrl,
      'analytics': googleAnalyticsCustomDimensions
    }, function (err, body) {
      if (err) done(err)
      body.should.containSelector('script').withText(googleAnalyticsScript)
      checkGACustomDimensions(body)
      done()
    })
  })

  it('should be enabled when waiting for auth', function (done) {
    renderTemplate('auth_waiting', {
      'analytics': googleAnalyticsCustomDimensions
    }, function (err, body) {
      if (err) done(err)
      body.should.containSelector('script').withText(googleAnalyticsScript)
      checkGACustomDimensions(body)
      done()
    })
  })

  it('should be enabled when waiting for capture', function (done) {
    renderTemplate('capture_waiting', {
      'analytics': googleAnalyticsCustomDimensions
    }, function (err, body) {
      if (err) done(err)
      body.should.containSelector('script').withText(googleAnalyticsScript)
      checkGACustomDimensions(body)
      done()
    })
  })

  it('should be enabled when user cancels a payment', function (done) {
    renderTemplate('user_cancelled', {
      'analytics': googleAnalyticsCustomDimensions
    }, function (err, body) {
      if (err) done(err)
      body.should.containSelector('script').withText(googleAnalyticsScript)
      checkGACustomDimensions(body)
      done()
    })
  })
})
