import { StageConfig as StageConfig } from '../StageConfig'
import { isRunPipelineFunction } from './RunPipelineFunction'
import { isAnyStage } from './isAnyStage'
import { AllowedStage } from './AllowedStage'

export function isAllowedStage<R, C extends StageConfig<R>>(inp: any): inp is AllowedStage<R, C> {
  return isRunPipelineFunction(inp) || isAnyStage(inp) || typeof inp == 'object' || typeof inp == 'string'
}
