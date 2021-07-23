'use strict'

const { expect } = require('chai')
const { validateEmail } = require('../../app/utils/email-validation')

// test emails taken from Notify's internal validation
// https://github.com/alphagov/notifications-utils
const validEmailAddresses = [
  'email@domain.com',
  'email@domain.COM',
  'firstname.lastname@domain.com',
  'firstname.o\'lastname@domain.com',
  'email@subdomain.domain.com',
  'firstname+lastname@domain.com',
  '1234567890@domain.com',
  'email@domain-one.com',
  '_______@domain.com',
  'email@domain.name',
  'email@domain.superlongtld',
  'email@domain.co.jp',
  'firstname-lastname@domain.com',
  'info@german-financial-services.vermögensberatung',
  'info@german-financial-services.reallylongarbitrarytldthatiswaytoohugejustincase',
  'japanese-info@例え.テスト',
  'email@double--hyphen.com'
]
const invalidEmailAddresses = [
  'email@123.123.123.123',
  'email@[123.123.123.123]',
  'plainaddress',
  '@no-local-part.com',
  'Outlook Contact <outlook-contact@domain.com>',
  'no-at.domain.com',
  'no-tld@domain',
  ';beginning-semicolon@domain.co.uk',
  'middle-semicolon@domain.co;uk',
  'trailing-semicolon@domain.com;',
  '"email+leading-quotes@domain.com',
  'email+middle"-quotes@domain.com',
  '"quoted-local-part"@domain.com',
  '"quoted@domain.com"',
  'lots-of-dots@domain..gov..uk',
  'two-dots..in-local@domain.com',
  'multiple@domains@domain.com',
  'spaces in local@domain.com',
  'spaces-in-domain@dom ain.com',
  'underscores-in-domain@dom_ain.com',
  'pipe-in-domain@example.com|gov.uk',
  'comma,in-local@gov.uk',
  'comma-in-domain@domain,gov.uk',
  'pound-sign-in-local£@domain.com',
  'local-with-’-apostrophe@domain.com',
  'local-with-”-quotes@domain.com',
  'domain-starts-with-a-dot@.domain.com',
  'brackets(in)local@domain.com',
  `email-too-long-${'a'.repeat(320)}@example.com`,
  'incorrect-punycode@xn---something.com'
]

describe('Email validation', () => {
  validEmailAddresses.forEach(email => {
    it(`Email address ${email} should be valid`, () => {
      const result = validateEmail(email)
      expect(result.valid).to.equal(true)
    })
  })

  invalidEmailAddresses.forEach(email => {
    it(`Email address ${email} should be invalid`, () => {
      const result = validateEmail(email)
      expect(result.valid).to.equal(false)
    })
  })

  it('should return domain for valid email', () => {
    const result = validateEmail('email@subdomain.domain.com')
    expect(result.valid).to.equal(true)
    expect(result.domain).to.equal('subdomain.domain.com')
  })

  it('should return non-converted hostname for non-ascii', () => {
    const result = validateEmail('japanese-info@例え.テスト')
    expect(result.valid).to.equal(true)
    expect(result.domain).to.equal('例え.テスト')
  })
})
