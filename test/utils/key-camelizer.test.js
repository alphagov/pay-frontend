'use strict'

const expect = require('chai').expect
const { camelize, decamelize } = require('../../app/utils/key-camelizer')

const simpleSnakeObj = {
  attr_one: 'foo',
  attr_two: 'bar'
}

const simpleCamelObj = {
  attrOne: 'foo',
  attrTwo: 'bar'
}

const simplePascalObj = {
  AttrOne: 'foo',
  AttrTwo: 'bar'
}

const complexSnakeObj = {
  attr_one: 'foo',
  attr_two: {
    nested_attr1: 'bar'
  },
  attr_three: {
    nested_attr2: {
      nested_attr3: [{
        nested_in_array1: 'baz'
      }, {
        nested_in_array2: 'hello'
      }, {
        nested_in_array3: ['world', 'boo']
      }]
    }
  }
}

const complexCamelObj = {
  attrOne: 'foo',
  attrTwo: {
    nestedAttr1: 'bar'
  },
  attrThree: {
    nestedAttr2: {
      nestedAttr3: [{
        nestedInArray1: 'baz'
      }, {
        nestedInArray2: 'hello'
      }, {
        nestedInArray3: ['world', 'boo']
      }]
    }
  }
}

const complexPascalObj = {
  AttrOne: 'foo',
  AttrTwo: {
    NestedAttr1: 'bar'
  },
  AttrThree: {
    NestedAttr2: {
      NestedAttr3: [{
        NestedInArray1: 'baz'
      }, {
        NestedInArray2: 'hello'
      }, {
        NestedInArray3: ['world', 'boo']
      }]
    }
  }
}

const complexCustomObj = {
  'attr-one': 'foo',
  'attr-two': {
    'nested-attr1': 'bar'
  },
  'attr-three': {
    'nested-attr2': {
      'nested-attr3': [{
        'nested-in-array1': 'baz'
      }, {
        'nested-in-array2': 'hello'
      }, {
        'nested-in-array3': ['world', 'boo']
      }]
    }
  }
}

const nestedNullObj = {
  attr_one: 'foo',
  attr_two: 'bar',
  attr_three: {
    nested_obj: null
  }
}

const camelizedNestedNullObj = {
  attrOne: 'foo',
  attrTwo: 'bar',
  attrThree: {
    nestedObj: null
  }
}

describe('camelize', () => {
  it('converts a simple snake case object keys to camel case', () => {
    const result = camelize(simpleSnakeObj)
    expect(result).to.deep.equal(simpleCamelObj)
  })
  it('converts a simple pascal case object to camel case', () => {
    const result = camelize(simplePascalObj)
    expect(result).to.deep.equal(simpleCamelObj)
  })
  it('converts a complex snake case object to camel case', () => {
    const result = camelize(complexSnakeObj)
    expect(result).to.deep.equal(complexCamelObj)
  })
  it('converts a complex pascal case object to camel case', () => {
    const result = camelize(complexPascalObj)
    expect(result).to.deep.equal(complexCamelObj)
  })
  it('converts a complex custom object to camel case', () => {
    const result = camelize(complexCustomObj)
    expect(result).to.deep.equal(complexCamelObj)
  })
  it('converts an object which has a property value of null', () => {
    const result = camelize(nestedNullObj)
    expect(result).to.deep.equal(camelizedNestedNullObj)
  })
  it('does not convert anything if a number is passed to it', () => {
    const result = camelize(34)
    expect(result).to.deep.equal(34)
  })
  it('does not convert anything if a string is passed to it', () => {
    const result = camelize('Test string')
    expect(result).to.deep.equal('Test string')
  })
})

describe('decamelize', () => {
  it('converts a simple camel case object keys to snake case', () => {
    const result = decamelize(simpleCamelObj)
    expect(result).to.deep.equal(simpleSnakeObj)
  })
  it('converst a complex camel cased object to snake case', () => {
    const result = decamelize(complexCamelObj)
    expect(result).to.deep.equal(complexSnakeObj)
  })
  it('converts an object which has a property value of null', () => {
    const result = decamelize(camelizedNestedNullObj)
    expect(result).to.deep.equal(nestedNullObj)
  })
  it('does not convert anything if a number is passed to it', () => {
    const result = decamelize(34)
    expect(result).to.deep.equal(34)
  })
  it('does not convert anything if a string is passed to it', () => {
    const result = decamelize('Test string')
    expect(result).to.deep.equal('Test string')
  })
})
