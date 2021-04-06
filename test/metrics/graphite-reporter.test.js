'use strict'

const { expect } = require('chai')
const { getCounter } = require('../../app/metrics/graphite_reporter')

describe('graphite reporter test', () => {
  it('counter should be incremented', () => {
    getCounter('a.b.c').inc()
    expect(getCounter('a.b.c').count).to.equal(1)
    getCounter('a.b.c').inc()
    expect(getCounter('a.b.c').count).to.equal(2)
  })   
})