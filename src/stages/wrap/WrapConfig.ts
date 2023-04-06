import { AllowedStageStored, ContextType, StageConfig, StageObject } from '../../stage'

export interface WrapConfig<R extends StageObject, T extends StageObject> extends StageConfig<R> {
  stage: AllowedStageStored<R, StageConfig<R>>
  prepare?: (ctx: ContextType<R>) => ContextType<T>
  finalize?:
    | ((ctx: ContextType<R>, retCtx: ContextType<T>) => ContextType<R>)
    | ((ctx: ContextType<R>, retCtx: ContextType<T>) => void)
}
