import { z } from 'zod'
import {
  CompileFunction,
  EnsureFunction,
  Precompile,
  Rescue,
  RunPipelineFunction,
  StageObject,
  ValidateFunction,
} from './types'

export interface StageConfig<R extends StageObject> {
  run?: RunPipelineFunction<R>
  name?: string
  rescue?: Rescue
  schema?: z.ZodType<R>
  ensure?: EnsureFunction<R>
  validate?: ValidateFunction<R>
  compile?: CompileFunction<R>
  precompile?: Precompile<R>
}

export const StageConfigSchema = z.object({
  run: z.function().optional(),
  name: z.string().optional(),
  rescue: z.function().optional(),
  schema: z.any().optional(),
  ensure: z.function().optional(),
  validate: z.function().optional(),
  compile: z.function().optional(),
  precompile: z.function().optional(),
})

export const isStageConfig = <R extends StageObject>(inp: unknown): inp is StageConfig<R> => {
  const res = StageConfigSchema.safeParse(inp)
  return res.success
}