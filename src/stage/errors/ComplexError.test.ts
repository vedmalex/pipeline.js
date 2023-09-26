import { ComplexError } from './ComplexError'

describe('Complex Error', () => {
  it('creates error from any paylod', () => {
    // @ts-expect-error
    expect(new ComplexError(1)).toBeInstanceOf(ComplexError)
    // @ts-expect-error
    expect(new ComplexError(true)).toBeInstanceOf(ComplexError)
    // @ts-expect-error
    expect(new ComplexError(null)).toBeInstanceOf(ComplexError)
    expect(new ComplexError([]).payload.length).toBe(1)
    // @ts-expect-error
    expect(new ComplexError([], 1, 3).payload.length).toBe(3)
  })
})
