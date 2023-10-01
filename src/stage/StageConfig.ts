import { z } from 'zod'
import { CompileFunction, Rescue, RunPipelineFunction } from './types'

// включить тип для вычисления параметра
export interface Config<Input, Output> {
  name?: string
  input?: z.ZodType<Input>
  output?: z.ZodType<Output>
  rescue?: Rescue
  compile?: CompileFunction<Input, Output>
}

export interface StageConfig<Input, Output> extends Config<Input, Output> {
  run?: RunPipelineFunction<Input, Output>
}
