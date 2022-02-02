import { Possible } from './types'

export function CreateError<T extends { message: string }> (
  err: string | T | null | undefined | (string | T | null | undefined)[],
): Possible<ComplexError> {
  if (typeof err == 'string') {
    return new Error(err)
  }
  if (typeof err == 'object') {
    if (Array.isArray(err)) {
      let result: Array<Possible<Error>> = []
      err
        .filter((e) => e)
        .forEach((ler) => {
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
        return ErrorList(result)
      }
      if (result.length === 1) {
        return result[0]
      }
    } else {
      return err as unknown as Error
    }
  }
  new Error('unknown error, see console for details')
}

export type ComplexError = Error & {
  isComplex?: Boolean
  errors?: Array<ComplexError>
}

function ErrorList (_list: Array<any>): ComplexError {
  let errors
  const list = _list.filter((e) => e)
  if (list.length > 1) {
    errors = list
  } else if ((list.length = 1)) {
    return list[0]
  } else {
    return null as any
  }
  const error = errors[0]
  error.errors = errors
  error.isComplex = true
  return error
}
