'use strict'

const expect = require('chai').expect

const { output, redact } = require('../../app/utils/structured_logging_value_helper.js')

describe('The output function', () => {
  it('returns "(null)" for a null value', () => {
    expect(output(null)).to.equal('(null)')
  })

  it('returns "(array)" for an array', () => {
    expect(output([])).to.equal('(array)')
  })

  it('returns "(object)" for an object', () => {
    expect(output({})).to.equal('(object)')
  })

  it('returns "(number)" for an number', () => {
    expect(output(42)).to.equal('(number)')
  })

  it('returns "(boolean)" for true', () => {
    expect(output(true)).to.equal('(boolean)')
  })

  it('returns "(boolean)" for false', () => {
    expect(output(false)).to.equal('(boolean)')
  })

  it('returns "(empty string)" for the empty string', () => {
    expect(output('')).to.equal('(empty string)')
  })

  it('returns "(blank string)" for a non-empty blank string', () => {
    expect(output(' ')).to.equal('(blank string)')
  })

  it('returns the actual string for a non-blank string', () => {
    expect(output('cake')).to.equal('cake')
  })
})

describe('The redact function', () => {
  it('returns "(null)" for a null value', () => {
    expect(redact(null)).to.equal('(null)')
  })

  it('returns "(array)" for an array', () => {
    expect(redact([])).to.equal('(array)')
  })

  it('returns "(object)" for an object', () => {
    expect(redact({})).to.equal('(object)')
  })

  it('returns "(number)" for an number', () => {
    expect(redact(42)).to.equal('(number)')
  })

  it('returns "(boolean)" for true', () => {
    expect(redact(true)).to.equal('(boolean)')
  })

  it('returns "(boolean)" for false', () => {
    expect(redact(false)).to.equal('(boolean)')
  })

  it('returns "(empty string)" for the empty string', () => {
    expect(redact('')).to.equal('(empty string)')
  })

  it('returns "(blank string)" for a non-empty blank string', () => {
    expect(redact(' ')).to.equal('(blank string)')
  })

  it('returns "(redacted non-blank string)" for a non-blank string', () => {
    expect(redact('cake')).to.equal('(redacted non-blank string)')
  })
})
