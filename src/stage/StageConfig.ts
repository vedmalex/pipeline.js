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
