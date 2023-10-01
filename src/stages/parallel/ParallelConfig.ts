import { AnyStage, Config } from '../../stage'

export interface ParallelConfig<Input, Output, T> extends Config<Input, Output> {
  stage: AnyStage<Input, Output>
  split?: (ctx: Input) => Array<T>
  combine?: (ctx: Input, children: Array<T>) => Output
}
