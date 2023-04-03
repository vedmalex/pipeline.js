import { StageConfig, AllowedStageStored, ContextType } from '../../stage'

export interface DoWhileConfig<R, T> extends StageConfig<R> {
  stage: AllowedStageStored<R, StageConfig<R>>
  split?: (ctx: ContextType<R>, iter: number) => T
  reachEnd?: (err: unknown, ctx: ContextType<R>, iter: number) => unknown
}
