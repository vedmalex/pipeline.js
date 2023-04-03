import { JSONSchemaType } from 'ajv'
import * as z from 'zod'
import { CompileFunction, EnsureFunction, Precompile, Rescue, RunPipelineFunction, ValidateFunction } from './types'

export const StageConfig = z
  .object({
    run: RunPipelineFunction.optional(),
    name: z.string().optional(),
    rescue: Rescue.optional(),
    schema: z.object({}).passthrough().optional(),
    ensure: EnsureFunction.optional(),
    validate: z.function().optional(),
    compile: z.function().optional(),
    precompile: z.function().optional(),
  })
  .passthrough()
  .refine(obj => {
    return !((obj.ensure && obj.validate) || (obj.ensure && obj.schema) || (obj.validate && obj.schema))
  }, 'ensure, validate, and schema are mutually exclusive')

export function isStageConfig<R>(obj: unknown): obj is StageConfig<R> {
  return typeof obj === 'object' && obj !== null && StageConfig.safeParse(obj)['success']
}

export interface StageConfig<R> {
  run?: RunPipelineFunction<R>
  name?: string
  rescue?: Rescue<R>
  schema?: JSONSchemaType<R>
  ensure?: EnsureFunction<R>
  validate?: ValidateFunction<R>
  compile?: CompileFunction<R>
  precompile?: Precompile<R>
}
