import { ComplexError } from './ComplexError'

export function isComplexError(inp: unknown): inp is ComplexError {
  if (inp instanceof ComplexError) {
    return true
  } else if (
    typeof inp == 'object'
    && inp
    && 'isComplex' in inp
    && 'payload' in inp
    && Array.isArray(inp.payload)
    && inp.isComplex
  ) {
    return true
  } else {
    return false
  }
}
