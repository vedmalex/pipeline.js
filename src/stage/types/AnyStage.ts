import { z, ZodSchema } from 'zod'
import { RunConfig, StageConfig, validatorRun } from '../StageConfig'

export const StageSymbol = Symbol('stage')
export interface AnyStage<Input, Output> {
  exec(
    context: Input,
  ): Promise<Output>
}

export function validateAnyStage<Input, Output>(config: StageConfig<Input, Output> & RunConfig<Input, Output>) {
  const input: ZodSchema = config?.input ? config.input : z.any()
  const output: ZodSchema = config?.output ? config.output : z.any()
  return z.object({
    exec: validatorRun(input, output),
  }).passthrough()
}
