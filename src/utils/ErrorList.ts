import { Possible } from './types'

export function CreateError(
  err:
    | string
    | Error
    | ComplexError
    | null
    | undefined
    | (string | Error | ComplexError | null | undefined)[],
): Possible<ComplexError> {
  if (typeof err == 'string') {
    return new ComplexError(new Error(err))
  }
  if (typeof err == 'object' && err !== null) {
    if (Array.isArray(err)) {
      let result: Array<Error> = []
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

export function isComplexError(inp: any): inp is ComplexError {
  return inp.isComplex && Array.isArray(inp.payload)
}
export class ComplexError extends Error {
  payload: Array<Error>
  isComplex: boolean
  // to store all details of single error
  constructor(...payload: Array<Error>) {
    debugger
    super()
    this.payload = payload
    this.isComplex = true
  }
}
