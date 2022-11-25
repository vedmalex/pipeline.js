import { Possible } from './types'

export function CreateError<T extends { message: string }>(
  err: string | T | null | undefined | (string | T | null | undefined)[],
): Possible<ComplexError> {
  if (typeof err == 'string') {
    return new ComplexError({ message: err })
  }
  if (typeof err == 'object') {
    if (Array.isArray(err)) {
      let result: Array<Possible<ComplexError>> = []
      err
        .filter(e => e)
        .forEach(ler => {
          const res = CreateError(ler)
          if (res) {
            if ('isComplex' in res && res.errors) {
              result.push(...res.errors)
            } else {
              result.push(res)
            }
          }
        })
      if (result.length > 1) {
        return ErrorList(result as any)
      }
      if (result.length === 1) {
        return result[0] as any
      }
    } else if (err) {
      return new ComplexError(err)
    } else {
      return err as unknown as ComplexError
    }
  }
  new Error('unknown error, see console for details')
}

// export type ComplexError = Error & {
//   isComplex?: Boolean
//   errors?: Array<ComplexError>
// }

export class ComplexError<
  T extends { [key: string]: any } = any,
> extends Error {
  payload: T
  isComplex: boolean;
  [key: string]: any
  constructor(payload: T) {
    super()
    this.payload = payload
    this.isComplex = true
    Object.keys(payload).forEach(f => {
      this[f] = payload[f]
    })
  }
}

function ErrorList<T extends { [key: string]: any }>(
  _list: Array<ComplexError<T>>,
): ComplexError<T> | null {
  let errors: Array<ComplexError>
  const list = _list.filter(e => e)
  if (list.length > 1) {
    errors = list
  } else if ((list.length = 1)) {
    return list[0]
  } else {
    return null as any
  }
  return new ComplexError<any>({ errors })
}
