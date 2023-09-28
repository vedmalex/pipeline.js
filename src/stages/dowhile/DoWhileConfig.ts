import { AllowedStageStored, StageConfig } from '../../stage'

export interface DoWhileConfig<Input, Output, T> extends StageConfig<Input, Output> {
  stage: AllowedStageStored<Input, Output, StageConfig<Input, Output>>
  split?: (ctx: Output, iter: number) => T
  reachEnd?: (err: unknown, ctx: Input, iter: number) => unknown
}
