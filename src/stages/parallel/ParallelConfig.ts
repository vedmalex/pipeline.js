import { AllowedStageStored, StageConfig } from '../../stage'

export interface ParallelConfig<Input, Output, T> extends StageConfig<Input, Output> {
  stage: AllowedStageStored<Input, Output, StageConfig<Input, Output>>
  split?: (ctx: Input) => Array<T>
  combine?: (ctx: Input, children: Array<T>) => Output
}
