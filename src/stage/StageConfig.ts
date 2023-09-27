import { z } from 'zod'
import { CompileFunction, EnsureFunction, Precompile, Rescue, RunPipelineFunction, ValidateFunction } from './types'

export interface StageConfig<R> {
  run?: RunPipelineFunction<R>
  name?: string
  rescue?: Rescue<R>
  schema?: z.ZodType<R>
  ensure?: EnsureFunction<R>
  validate?: ValidateFunction<R>
  compile?: CompileFunction<R>
  precompile?: Precompile<R>
}
