import { Possible } from './types/types'

export function CreateError(err: unknown | Array<unknown>): Possible<ComplexError> {
  if (typeof err == 'string') {
    return new ComplexError(new Error(err))
  }
  if (typeof err == 'object' && err !== null) {
    if (Array.isArray(err)) {
      let result: Array<unknown> = []
      err
        .filter(e => e)
        .forEach(ler => {
          const res = CreateError(ler)
          if (res) {
            if (res.payload) {
              result.push(...res.payload)
            } else {
              result.push(res)
            }
          }
        })
      if (result.length > 1) {
        return new ComplexError(...result)
      }
      if (result.length === 1) {
        return result[0] as any
      }
    } else if (err) {
      if (isComplexError(err)) {
        return err
      } else {
        return new ComplexError(err)
      }
    }
  }
  // throw new Error('unknown error, see console for details')
}

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
export class ComplexError extends Error {
  payload: Array<unknown>
  isComplex: boolean
  // to store all details of single error
  constructor(...payload: Array<unknown>) {
    super()
    this.payload = payload
    this.isComplex = true
  }
}
