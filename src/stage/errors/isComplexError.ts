import { ComplexError } from './ErrorList'

export function isComplexError(inp: unknown): inp is ComplexError {
  if (
    typeof inp == 'object' &&
    inp &&
    'isComplex' in inp &&
    'payload' in inp &&
    Array.isArray(inp.payload) &&
    inp.isComplex
  ) {
    return true
  } else {
    return false
  }
}
