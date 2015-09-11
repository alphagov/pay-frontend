process.env.SESSION_ENCRYPTION_KEY = 'naskjwefvwei72rjkwfmjwfi72rfkjwefmjwefiuwefjkbwfiu24fmjbwfk';

var request = require('supertest');
var portfinder = require('portfinder');
var nock = require('nock');
var app = require(__dirname + '/../server.js').getApp;
var clientSessions = require("client-sessions");

portfinder.getPort(function(err, connectorPort) {

  var localServer = 'http://localhost:' + connectorPort;

  var connectorChargePath = '/v1/api/charge/';
  var frontendChargePath = '/charge';
  var chargeId = '23144323';

  var connectorAuthUrl = localServer + connectorChargePath + chargeId + '/cards';

  process.env.CONNECTOR_URL = localServer + connectorChargePath + '{chargeId}';

  var connectorMock = nock(localServer);

  process.env.CONNECTOR_URL = localServer + connectorChargePath + '{chargeId}';

  var cookieValue = clientSessions.util.encode(
      {
        'cookieName': 'session_state',
        'secret': process.env.SESSION_ENCRYPTION_KEY
      },
      {
        'chargeId': chargeId,
        'cardAuthUrl': connectorAuthUrl
      }
  );

  function connector_responds_with(charge) {
    connectorMock.get(connectorChargePath + chargeId).reply(200, charge);
  }

  function connector_expects(data) {
    return connectorMock.post(connectorChargePath + chargeId + '/cards', data);
  }

  function get_charge_request() {
    return request(app)
        .get(frontendChargePath)
        .set('Cookie', ['session_state=' + cookieValue])
        .set('Accept', 'application/json');
  }

  function post_charge_request(data) {
    return request(app)
        .post(frontendChargePath)
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('Cookie', ['session_state=' + cookieValue])
        .set('Accept', 'application/json')
        .send(data);
  }

  function minimum_connector_card_data(card_number) {
    return {
      'card_number': card_number,
      'cvc': '234',
      'expiry_date': '11/99',
      'cardholder_name': 'Jimi Hendrix',
      'address': {
        'line1': '32 Whip Ma Whop Ma Avenue',
        'postcode': 'Y1 1YN',
        'country': 'GB'
      }
    };
  }

  function minimum_form_card_data(card_number) {
    return {
      'cardUrl': connectorAuthUrl,
      'chargeId': chargeId,
      'cardNo': card_number,
      'cvc': '234',
      'expiryDate': '11/99',
      'cardholderName': 'Jimi Hendrix',
      'addressLine1': '32 Whip Ma Whop Ma Avenue',
      'addressPostcode': 'Y1 1YN'
    };
  }

  describe('The /charge endpoint', function() {
    it('should include the data required for the frontend', function(done) {
      var serviceUrl = 'http://www.example.com/service';
      connector_responds_with({
        'amount': 2345,
        'service_url': serviceUrl,
        'links': [{
          'href': connectorAuthUrl,
          'rel': 'cardAuth',
          'method': 'POST'
        }]
      });

      get_charge_request().expect(200, {
          'amount' : '23.45',
          'service_url' : serviceUrl,
        'card_auth_url': connectorAuthUrl,
        'post_card_action': frontendChargePath
      }).end(done);
    });

    it('should send clean card data to connector', function(done) {
      connector_expects(minimum_connector_card_data('5105105105105100'))
          .reply(204);

      post_charge_request(minimum_form_card_data('5105 1051 0510 5100'))
          .expect(303)
          .expect('Location', frontendChargePath + '/' + chargeId + '/confirm')
          .end(done);
    });

    it('should send card data including optional fields to connector', function (done) {
      var card_data = minimum_connector_card_data('5105105105105100');
      card_data.address.line2 = 'bla bla';
      card_data.address.line3 = 'blublu';
      card_data.address.city = 'London';
      card_data.address.county = 'Greater London';
      card_data.address.country = 'GB';

      connector_expects(card_data).reply(204);

      var form_data = minimum_form_card_data('5105105105105100');
      form_data.addressLine2 = card_data.address.line2;
      form_data.addressLine3 = card_data.address.line3;
      form_data.addressCity = card_data.address.city;
      form_data.addressCounty = card_data.address.county;

      post_charge_request(form_data)
          .expect(303)
          .expect('Location', frontendChargePath + '/' + chargeId + '/confirm')
          .end(done);
    });

    it('show an error page when authorization was refused', function(done) {
      connector_expects(minimum_connector_card_data('5105105105105100'))
          .reply(400, {'message': 'This transaction was declined.'});

      post_charge_request(minimum_form_card_data('5105105105105100'))
          .expect(200, {'message': 'Payment could not be processed, please contact your issuing bank'})
          .end(done);
    });
  });
});