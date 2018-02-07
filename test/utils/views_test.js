'use strict'

// npm dependencies
const {expect} = require('chai')

// local dependencies
const serviceFixtures = require('../fixtures/service_fixtures')
const Service = require('../../app/models/Service.class')
const views = require('../../app/utils/views.js')
const sinon = require('sinon')
const _ = require('lodash')

describe('views helper', function () {
  const service = serviceFixtures.validServiceResponse().getPlain()

  const response = {
    status: function () {},
    render: function () {},
    locals: {service: new Service(service)}
  }

  let status
  let render

  beforeEach(function () {
    status = sinon.stub(response, 'status')
    render = sinon.stub(response, 'render')
  })

  afterEach(function () {
    status.restore()
    render.restore()
  })

  it('should call a view correctly', () => {
    views.display(response, 'NOT_FOUND')
    expect(status.lastCall.args).to.deep.equal([404])
    expect(render.lastCall.args).to.deep.equal(['error', {message: 'Page cannot be found', viewName: 'NOT_FOUND'}])
  })

  it('should return a 200 by default', () => {
    views.display(response, 'CAPTURE_FAILURE')
    expect(status.lastCall.args).to.deep.equal([200])
    expect(render.lastCall.args).to.deep.equal(['errors/incorrect_state/capture_failure', {viewName: 'CAPTURE_FAILURE'}])
  })

  it('should return locals passed in', () => {
    views.display(response, 'HUMANS', {custom: 'local'})
    expect(render.lastCall.args[1]).to.have.property('custom').to.equal('local')
  })

  it('should rendor error view when view not found', function () {
    views.display(response, 'AINT_NO_VIEW_HERE')
    expect(status.lastCall.args).to.deep.equal([500])
    expect(render.lastCall.args).to.deep.equal(['error', {message: 'There is a problem, please try again later', viewName: 'error'}])
  })

  const defaultTemplates = {
    'ERROR': {
      template: 'error',
      code: 500,
      message: 'There is a problem, please try again later'
    },
    'NOT_FOUND': {
      template: 'error',
      code: 404,
      message: 'Page cannot be found'
    },
    'HUMANS': {
      template: 'plain_message',
      code: 200,
      message: 'GOV.UK Payments is built by a team at the Government Digital Service in London. If you\'d like to join us, see https://gds.blog.gov.uk/jobs'
    }
  }

  _.forEach(defaultTemplates, (values, name) => {
    it('should be able to render default ' + name + ' page', () => {
      views.display(response, name)
      expect(status.lastCall.args).to.deep.equal([values.code])
      expect(render.lastCall.args).to.deep.equal([values.template, {message: values.message, viewName: name}])
    })
  }
  )
})
