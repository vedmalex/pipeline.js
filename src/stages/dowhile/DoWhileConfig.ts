import { AllowedStageStored, StageConfig } from '../../stage'

export interface DoWhileConfig<R, T> extends StageConfig<R> {
  stage: AllowedStageStored<R, StageConfig<R>>
  split?: (ctx: R, iter: number) => T
  reachEnd?: (err: unknown, ctx: R, iter: number) => unknown
}
