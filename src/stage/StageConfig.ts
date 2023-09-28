import { z } from 'zod'
import { CompileFunction, Rescue, RunPipelineFunction } from './types'

export interface StageConfig<Input, Output> {
  run?: RunPipelineFunction<Input, Output>
  name?: string
  input?: z.ZodType<Input>
  output?: z.ZodType<Output>
  rescue?: Rescue
  compile?: CompileFunction<Input, Output>
}
