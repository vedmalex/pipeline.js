import { AllowedStageStored, StageConfig } from '../../stage'

export interface WrapConfig<R, T> extends StageConfig<R> {
  stage: AllowedStageStored<R, StageConfig<R>>
  prepare?: (ctx: R) => T
  finalize?:
    | ((ctx: R, retCtx: T) => R)
    | ((ctx: R, retCtx: T) => void)
}
