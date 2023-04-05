import * as z from 'zod'

export type StageEvaluateFunction<R> = (ctx: R) => boolean
export const StageEvaluateFunctionValidator = z.custom<StageEvaluateFunction<unknown>>(
  (f: unknown): f is StageEvaluateFunction<unknown> => {
    if (typeof f === 'function') {
      return f.length === 1
    } else return false
  },
  'EvaluateFunction',
)

export function isEvaluateFunction<R>(arg: any): arg is StageEvaluateFunction<R> {
  return StageEvaluateFunctionValidator.safeParse(arg)['success']
}
