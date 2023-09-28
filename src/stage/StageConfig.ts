import { z } from 'zod'
import { CompileFunction, Rescue, RunPipelineFunction } from './types'

export interface StageConfig<R> {
  run?: RunPipelineFunction<R>
  name?: string
  input?: z.ZodType<R>
  output?: z.ZodType<R>
  rescue?: Rescue<R>
  compile?: CompileFunction<R>
}
