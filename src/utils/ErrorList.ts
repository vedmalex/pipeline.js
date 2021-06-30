export function CreateError(
  err: string | object | undefined | (string | object | undefined)[],
): Error | undefined {
  if (typeof err == 'string') {
    return new Error(err)
  }
  if (typeof err == 'object') {
    if (err instanceof ErrorList || err instanceof Error) {
      return err
    }
    if (Array.isArray(err)) {
      const result = err.filter(e => e).map(e => CreateError(e))
      return new ErrorList(result)
    } else if (err.hasOwnProperty('message')) {
      return err as Error
    } else {
      return new Error(JSON.stringify(err))
    }
  }
}
export class ErrorList extends Error {
  errors!: Array<{ message: string }>
  constructor(_list: Array<any> | any) {
    super('Complex Error')
    if (Array.isArray(_list)) {
      const list = _list.filter(e => e)
      if (list.length > 1) {
        this.errors = list
      } else if ((list.length = 1)) {
        return list[0]
      } else {
        // if there is no error return null or undefined
        return null as any
      }
    } else {
      return _list
    }
  }

  override get message() {
    return `ComplexError:\n\t${this.errors.map(e => e.message).join('\n')}`
  }
}
