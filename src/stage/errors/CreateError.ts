import { Possible } from '../types'
import { ComplexError } from './ErrorList'
import { isComplexError } from './isComplexError'

export function CreateError(err: Error | object | Array<Error | object | string> | string): Possible<ComplexError> {
  if (typeof err == 'string') {
    return new ComplexError(new Error(err))
  }
  if (typeof err == 'object' && err !== null) {
    if (Array.isArray(err)) {
      let result: Array<Error | object | string> = []
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
