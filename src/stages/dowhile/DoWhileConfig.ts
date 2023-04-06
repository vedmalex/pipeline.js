import { StageConfig, AllowedStageStored, ContextType, StageObject } from '../../stage'

export interface DoWhileConfig<R extends StageObject, T extends StageObject> extends StageConfig<R> {
  stage: AllowedStageStored<R, StageConfig<R>>
  split?: (ctx: ContextType<R>, iter: number) => T
  reachEnd?: (err: unknown, ctx: ContextType<R>, iter: number) => unknown
}
