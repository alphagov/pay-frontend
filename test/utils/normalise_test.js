var should = require('chai').should();
var assert = require('assert');
var expect = require('chai').expect;
var normalise= require(__dirname + '/../../app/services/normalise_charge.js');

var _      = require('lodash');

var unNormalisedCharge = {
  amount: 1234,
  return_url: "foo",
  description: "bar",
  links: [ {
    rel: "rar",
    href: "http://foo"
  }],
  status: "status"
};

var normalisedCharge = {
  id: 1,
  amount: "12.34",
  return_url: "foo",
  description: "bar",
  links: [{
    rel: "rar",
    href: "http://foo"
  }],
  status: "status"
};

var unNormalisedAddress = {
  addressLine1: "a",
  addressLine2: "b",
  addressCity: "c",
  addressPostcode: "d"
};

var normalisedApiAddress = {
  line1: "a",
  line2: "b",
  city: "c",
  postcode: "d",
  country: "GB"
};


describe('normalise', function () {

  describe('charge', function () {
    it('should return a refined state', function () {
      var result = normalise.charge(unNormalisedCharge,1);
      expect(result).to.deep.equal(normalisedCharge);
    });
  });

  describe('api address', function () {
    it('should return a refined adress for the api', function () {
      var result = normalise.addressForApi(unNormalisedAddress);
      expect(result).to.deep.equal(normalisedApiAddress);
    });
  });

  describe('addresslines', function () {
    it('should return the body with adressline 2 moved to address line 1 if filled', function () {
      var passedByReference = { addressLine2: "foo"}
      normalise.addressLines(passedByReference);
      expect(passedByReference).to.deep.equal({ addressLine1: "foo"});
      expect(passedByReference.addressLine2).to.be.undefined;
    });

    it('should do nothing if there is addressLine1', function () {
      var passedByReference = { addressLine1: "bar", addressLine2: "foo"}
      normalise.addressLines(passedByReference);
      expect(passedByReference).to.deep.equal({ addressLine1: "bar", addressLine2: "foo"});
    });
  });

  describe('address for view', function () {
    it('should return a comma seperated address', function () {
      var address = normalise.addressForView(unNormalisedAddress);
      expect(address).to.deep.equal("a, b, c, d");
    });

    it('should return a comma seperated address even with something missing', function () {
      var unNormalised = _.cloneDeep(unNormalisedAddress);
      delete unNormalised.addressCity;
      var address = normalise.addressForView(unNormalised);
      expect(address).to.deep.equal("a, b, d");
    });

  });

  describe('credit card', function () {
    it('should return stripping spaces', function () {
      var card = "1234 5678"
      var address = normalise.creditCard(card);
      expect(address).to.deep.equal("12345678");
    });

    it('should return stripping hyphens', function () {
      var card = "1234-5678"
      var address = normalise.creditCard(card);
      expect(address).to.deep.equal("12345678");
    });

  });
});
