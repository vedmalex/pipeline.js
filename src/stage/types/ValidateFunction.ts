export type ValidateFunction<Output> = (this: void, ctx: Output) => Promise<boolean> | boolean
export function ValidateFunction<Output>(inp: unknown): inp is ValidateFunction<Output> {
  return typeof inp == 'function' && inp.length == 1
}
