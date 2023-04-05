import 'jest'

import { CreateError } from './CreateError'
import { ComplexError } from './ComplexError'

describe('CreateError', () => {
  it('create Error from string', () => {
    expect(CreateError('string')).toBeInstanceOf(ComplexError)
  })
  it('create Error from Error', () => {
    expect(CreateError(new Error('string'))).toBeInstanceOf(ComplexError)
  })
  it('create Error from object', () => {
    expect(CreateError({})).toBeInstanceOf(ComplexError)
  })
  it('not create Error from empty input', () => {
    expect(CreateError(null)).toBeUndefined()
    expect(CreateError(undefined)).toBeUndefined()
    expect(CreateError()).toBeUndefined()
  })
  it('not create Error from empty array', () => {
    expect(CreateError([])).toBeUndefined()
  })
  it('ignore other primitive types except String', () => {
    expect(CreateError([1])).toBeUndefined()
    expect(CreateError([true])).toBeUndefined()
    expect(CreateError(['string'])).not.toHaveProperty('payload')
    expect(CreateError([true, 'string'])).not.toHaveProperty('payload')
    expect(CreateError([true, 'string'])).not.toBeInstanceOf(ComplexError)
    expect(CreateError([true, 'string', 'string 2'])?.payload.length).toBe(2)
  })

  it('create Error from Array of ComplexError', () => {
    expect(CreateError([10, 'string']))
  })
  it('reuse existing error', () => {
    const error = CreateError('error')
    expect(CreateError(error)).toEqual(error)
  })
})
