var path = require('path')
var assert = require('assert')
const serviceFixtures = require('../fixtures/service_fixtures')
const Service = require('../../app/models/Service.class')
var views = require(path.join(__dirname, '/../../app/utils/views.js'))
var sinon = require('sinon')
var _ = require('lodash')

describe('views helper', function () {
  const service = serviceFixtures.validServiceResponse().getPlain()

  var response = {
    status: function () {},
    render: function () {},
    locals: {service: new Service(service)}
  }

  var status
  var render
  var testView = {
    TEST_VIEW: {
      view: 'TEST_VIEW',
      code: 999
    }
  }

  beforeEach(function () {
    status = sinon.stub(response, 'status')
    render = sinon.stub(response, 'render')
  })

  afterEach(function () {
    status.restore()
    render.restore()
  })

  it('should call a merged view correctly', function () {
    var _views = views.create(testView)
    _views.display(response, 'TEST_VIEW')
    assert(status.calledWith(999))
    assert(render.calledWith('TEST_VIEW', {viewName: 'TEST_VIEW'}))
  })

  it('should return a 200 by default', function () {
    var view = _.cloneDeep(testView)
    delete view.TEST_VIEW.code
    var _views = views.create(view)
    _views.display(response, 'TEST_VIEW')
    assert(status.calledWith(200))
    assert(render.calledWith('TEST_VIEW', {viewName: 'TEST_VIEW'}))
  })

  it('should return locals passed in', function () {
    var view = _.cloneDeep(testView)
    var _views = views.create(view)
    _views.display(response, 'TEST_VIEW', {a: 'local'})
    assert(status.calledWith(999))
    assert(render.calledWith('TEST_VIEW', {viewName: 'TEST_VIEW', a: 'local'}))
  })

  it('should rendor error view when view not found', function () {
    var _views = views.create()
    _views.display(response, 'AINT_NO_VIEW_HERE')
    assert(status.calledWith(500))
    assert(render.calledWith('error', {
      message: 'There is a problem, please try again later',
      viewName: 'error'
    }))
  })

  var defaultTemplates = {
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

  _.forEach(defaultTemplates,
    function (values, name) {
      it('should be able to render default ' + name + ' page', function () {
        var _views = views.create()
        _views.display(response, name)
        assert(status.calledWith(values.code))
        assert(render.calledWith(values.template, {
          message: values.message,
          viewName: name
        }))
      })

      it('should be able to ovverride the default ' + name + ' message', function () {
        var _views = views.create()
        _views.display(response, name, {message: 'lol'})
        assert(status.calledWith(values.code))
        assert(render.calledWith(values.template, {
          message: 'lol',
          viewName: name
        }))
      })

      it('should be able to ovverride the default ' + name + ' template', function () {
        var overriden = {}
        overriden[name] = {view: 'foo', code: 333}
        var _views = views.create(overriden)
        _views.display(response, name, {message: 'lol'})
        assert(status.calledWith(333))
        assert(render.calledWith('foo', {message: 'lol', viewName: name}))
      })
    }
  )
})
