var renderTemplate = require(__dirname + '/test_helpers/html_assertions.js').render;
var should = require('chai').should();

describe('Frontend analytics', function () {

    var googleAnalyticsScript = '//www.google-analytics.com/analytics.js';

    it('should be enabled in charge view', function () {
        var templateData = {
            'amount': '50.00'
        };
        var body = renderTemplate('charge', templateData);
        body.should.containSelector('script').withText(googleAnalyticsScript);
    });

    it('should be enabled in confirm view', function () {
        var templateData = {
            'cardNumber': "************5100",
            'expiryDate': "11/99",
            'amount': "10.00",
            'paymentDescription': "Payment Description",
            'cardholderName': 'Random dude',
            'address': '1 street lane, avenue city, AB1 3DF',
            'serviceName': 'Service 1'
        };

        var body = renderTemplate('confirm', templateData);
        body.should.containSelector('script').withText(googleAnalyticsScript);
    });

    it('should be enabled in error view', function() {
        var msg = 'error processing your payment!';
        var body = renderTemplate('error', { 'message' : msg });
        body.should.containSelector('script').withText(googleAnalyticsScript);
    });

    it('should be enabled in error with return url view', function() {
        var msg = 'error processing your payment!';
        var return_url = 'http://some.return.url';
        var body = renderTemplate('error',
            { 'message' : msg,
              'return_url': return_url});
        body.should.containSelector('script').withText(googleAnalyticsScript);
    });
});
