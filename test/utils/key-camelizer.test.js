'use strict'

const expect = require('chai').expect
const { keysToCamelCase, keysToSnakeCase } = require('../../app/utils/key-camelizer')

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

const objectTests = [
  {nonCamelCase: simpleSnakeObj, camelizedCase: simpleCamelObj, objectName: 'simple snake object keys'},
  {nonCamelCase: simplePascalObj, camelizedCase: simpleCamelObj, objectName: 'simple pascal object keys'},
  {nonCamelCase: complexSnakeObj, camelizedCase: complexCamelObj, objectName: 'complex snake object keys'},
  {nonCamelCase: complexPascalObj, camelizedCase: complexCamelObj, objectName: 'complex pascal object keys'},
  {nonCamelCase: complexCustomObj, camelizedCase: complexCamelObj, objectName: 'complex custom object keys'},
  {nonCamelCase: nestedNullObj, camelizedCase: camelizedNestedNullObj, objectName: 'simple snake object with nested null property'},
]

const primitiveTypeTests = [
  {primitiveType: 34, objectName: 'number'},
  {primitiveType: 'Test string', objectName: 'string'},
  {primitiveType: true, objectName: 'boolean'}
]

const objectsForDecamelizingTests = objectTests.filter(obj => obj.objectName.includes('snake'));

describe('camelize', () => {
  objectTests.forEach( test => {
    const {nonCamelCase, camelizedCase, objectName} = test
    it(`converts a ${objectName} to camel case`, () => {
      const result = keysToCamelCase(nonCamelCase)
      expect(result).to.deep.equal(camelizedCase)
    })
  })
  primitiveTypeTests.forEach( test => {
    const {primitiveType, objectName} = test
    it(`does not convert a ${objectName} to camel case and returns an unchanged argument`, () => {
      const result = keysToCamelCase(primitiveType)
      expect(result).to.deep.equal(primitiveType)
    })
  })
})

describe('camelCaseToSnakeCase', () => {
  objectsForDecamelizingTests.forEach( test => {
    const {nonCamelCase, camelizedCase, objectName} = test
    it(`converts a ${objectName} to snake case`, () => {
      const result = keysToSnakeCase(camelizedCase)
      expect(result).to.deep.equal(nonCamelCase)
    })
  })
  primitiveTypeTests.forEach( test => {
    const {primitiveType, objectName} = test
    it(`does not convert a ${objectName} to camel case and returns and returns an unchanged argument`, () => {
      const result = keysToSnakeCase(primitiveType)
      expect(result).to.deep.equal(primitiveType)
    })
  })
})
