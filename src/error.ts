import { z } from 'zod'

export class ComplexError extends Error {
  payload: Array<Error | object | string>
  isComplex: boolean
  // to store all details of single error
  constructor(...payload: Array<Error | object | string>) {
    super()
    this.payload = payload
    this.isComplex = true
  }
}

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
export function CreateError(
  _err: Error | object | Array<Error | object | string> | string | unknown | null | undefined,
): ComplexError | undefined {
  const error = z.union([
    z.instanceof(Error),
    z.instanceof(ComplexError),
    z.object({}).passthrough(),
    z.string(),
    z.null(),
    z.undefined(),
  ])

  const err = z.union([error, z.array(error)]).parse(_err)

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
}

export const ERROR = {
  signature: 'unacceptable run method signature',
  invalid_context: 'context is invalid',
  argements_error: 'arguments Error',
  not_implemented: 'not implemented',
  rescue_MUST_return_value: 'rescue MUST return value',
  define_stage_before_use_of_rescue: 'define stage before use of rescue',
  operation_timeout_occured: 'operation timeout occured',
}
export type ParallelErrorInput = {
  index: number
  err: unknown
  ctx: unknown
}
export class ParallelError extends Error {
  index: number
  err: unknown
  ctx: unknown
  constructor(init: ParallelErrorInput) {
    super()
    this.name = 'ParallerStageError'
    this.ctx = init.ctx
    this.err = init.err
    this.index = init.index
  }
  override toString() {
    return `iteration ${this.index}
    ${this.err}`
  }
}
