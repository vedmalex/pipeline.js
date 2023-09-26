import { AllowedStageStored, StageConfig } from '../../stage'

export interface ParallelConfig<R, T> extends StageConfig<R> {
  stage: AllowedStageStored<R, StageConfig<R>>
  split?: (ctx: R) => Array<T>
  combine?: (ctx: R, children: Array<T>) => R
}
