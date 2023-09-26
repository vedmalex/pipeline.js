import { StageConfig, StageConfigSchema } from '../StageConfig'
import { RunPipelineFunction, RunPipelineFunctionSchema } from './RunPipelineFunction'
import { AnyStage, AnyStageSchema } from './AnyStage'
import { StageObject } from './StageObject'
import { z } from 'zod'

/**
 * хранимая часть конфига
 */
export type AllowedStageStored<R extends StageObject, CONFIG extends StageConfig<R>> =
  | CONFIG
  | RunPipelineFunction<R>
  | AnyStage<R>

 export const AllowedStageStoredSchema = z.union([StageConfigSchema, RunPipelineFunctionSchema, AnyStageSchema])