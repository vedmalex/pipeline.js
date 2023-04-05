import { CreateError } from './CreateError'
import { isComplexError } from './isComplexError'

describe('complex error', () => {
  it('detect Complex Error', () => {
    expect(isComplexError(CreateError('error'))).toBeTruthy()
    expect(isComplexError(new Error('error'))).toBeFalsy()
    expect(isComplexError({})).toBeFalsy()
    expect({ payload: [], isComplex: true }).toBeTruthy()
  })
})
