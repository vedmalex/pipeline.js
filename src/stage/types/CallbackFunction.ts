import * as z from 'zod'

export type CallbackFunction<R> = (err?: any, res?: R) => void

export const CallbackFunction = z
  .function()
  .args(z.any(), z.any())
  .returns(z.void())
  .superRefine((value, ctx) => {
    if (value.length <= 2) {
      ctx
    }
  })

export function isCallbackFunction<R>(inp?: unknown): inp is CallbackFunction<R> {
  return CallbackFunction.safeParse(inp).success
}
