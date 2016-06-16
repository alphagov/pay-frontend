require(__dirname + '/../test_helpers/html_assertions.js');
var should    = require('chai').should();
var assert    = require('assert');
var CardModel = require(__dirname + '/../../app/models/card.js');
var nock      = require('nock');
var originalHost = process.env.CONNECTOR_HOST
var wrongPromise = require(__dirname + '/../test_helpers/test_helpers.js').unexpectedPromise;

describe('card', function () {
  describe('check card', function() {
    describe('when card is not found', function () {
      before(function() {
        nock.cleanAll();

        nock(process.env.CARDID_HOST)
            .post("/v1/api/card")
            .reply(404);
      });

      it('should return the correct message', function () {
        return CardModel().checkCard(1234).then(wrongPromise,function(message){
          assert.equal(message,"Your card is not supported");
        });
      });
    });

    describe('when an unexpected response code', function () {
      before(function() {
        nock.cleanAll();

        nock(process.env.CARDID_HOST)
            .post("/v1/api/card")
            .reply(201);
      });

      it('should resolve', function () {
        return CardModel().checkCard(1234).then(()=>{},wrongPromise);
      });
    });

    describe('an unkown card', function () {
      before(function() {
        nock.cleanAll();

        nock(process.env.CARDID_HOST)
            .post("/v1/api/card")
            .reply(201);
      });

      it('should resolve', function () {
        return CardModel().checkCard(1234).then(()=>{},wrongPromise);
      });
    });

    describe('a card that is not allowed', function () {
      before(function() {
        nock.cleanAll();
        nock(process.env.CARDID_HOST)
          .post("/v1/api/card")
          .reply(200,{brand: "bar", label: "bar"});
      });

      it('should reject with appropriate message', function () {
        return CardModel([{brand: "foo", label: "foo"}])
        .checkCard(1234).then(wrongPromise,function(message){
          assert.equal(message,"Bar is not supported");
        });
      });
    });

    describe('a card that is not allowed debit withrawal type', function () {
      before(function() {
        nock.cleanAll();
        nock(process.env.CARDID_HOST)
          .post("/v1/api/card")
          .reply(200,{brand: "bar", label: "bar", type: 'D'});
      });

      it('should reject with appropriate message', function () {
        return CardModel([{brand: "bar", label: "bar", debit: false}])
        .checkCard(1234).then(wrongPromise,function(message){
          assert.equal(message,"Bar debit cards are not supported");
        });
      });
    });


    describe('a card that is not allowed Credit withrawal type', function () {
      before(function() {
        nock.cleanAll();
        nock(process.env.CARDID_HOST)
          .post("/v1/api/card")
          .reply(200,{brand: "bar", label: "bar", type: 'C'});
      });

      it('should reject with appropriate message', function () {
        return CardModel([{brand: "bar", label: "bar", credit: false}])
        .checkCard(1234).then(wrongPromise,function(message){
          assert.equal(message,"Bar credit cards are not supported");
        });
      });
    });


    describe('a card that is allowed', function () {
      before(function() {
        nock.cleanAll();
        nock(process.env.CARDID_HOST)
          .post("/v1/api/card")
          .reply(200,{brand: "bar", label: "bar", type: 'C'});
      });

      it('should reject with appropriate message', function () {
        return CardModel([{brand: "bar", label: "bar", credit: true }])
        .checkCard(1234).then(()=>{},wrongPromise);
      });
    });
  });

  describe('allowedCards',function() {

    it('should return the passed in cards', function () {
      var cards = [{brand: "foo", debit: true}];
      var Card = CardModel(cards);
      var CardCopy = CardModel(cards);
      assert.deepEqual(Card.allowed,cards);
      // shoudl return a copy
      assert.notEqual(Card.allowed,cards);
      assert.notEqual(Card.allowed,CardCopy.allowed);
    });

    it('should return the passed in cards wityhdrawal types', function () {
      var debitOnly = CardModel([{brand: "foo", debit: true}]);
      var creditOnly = CardModel([{brand: "foo", credit: true}]);
      var both = CardModel([{brand: "foo", credit: true, debit: true}]);

      assert.deepEqual(debitOnly.withdrawalTypes,["debit"]);
      assert.deepEqual(creditOnly.withdrawalTypes,["credit"]);
      assert.deepEqual(both.withdrawalTypes,["debit","credit"]);

    });

  });


  describe('withdrawalTypes',function() {

    it('should return the passed in cards wityhdrawal types', function () {
      var debitOnly = CardModel([{brand: "foo", debit: true}]);
      var creditOnly = CardModel([{brand: "foo", credit: true}]);
      var both = CardModel([{brand: "foo", credit: true, debit: true}]);

      assert.deepEqual(debitOnly.withdrawalTypes,["debit"]);
      assert.deepEqual(creditOnly.withdrawalTypes,["credit"]);
      assert.deepEqual(both.withdrawalTypes,["debit","credit"]);

    });

  });
});


