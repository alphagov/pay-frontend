'use strict'

const { expect } = require('chai')
const {commonTypos} = require('../../app/utils/email_tools')
// const validEmailList = require('./valid-email-list')
const invalidEmailList = require('./invalid-email-list')

describe('When Mailcheck is given a valid email ', () => {
  it('it should return empty as there is no problem', () => {
    expect(commonTypos('test@gmail.com')).to.equal()
  })
  invalidEmailList.map(domain => {
    domain.invalid.map(email => {
      const corrected = commonTypos(email)
      it(`${email} is invalid, should be ${corrected.full}`, () => {
        expect(corrected).to.deep.equal(domain.valid)
      })
    })
  })
  // I tested with 3000 de-deduped anonymised emails and it works, I don’t want to publish this list to the repo as I guess even domains can give away a persons identity, for example my email is jon@jonheslop.com and even after making it your.name@jonheslop.com it’s pretty obv who that is.
  // validEmailList.map(email => {
  //   const corrected = commonTypos(email)
  //   it(`${email} is invalid, should be ${corrected ? corrected.full : email}`, () => {
  //     expect(corrected).to.equal()
  //   })
  // })
})
