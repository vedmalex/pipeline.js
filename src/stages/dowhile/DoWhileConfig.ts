import { AnyStage, Config } from '../../stage'

export interface DoWhileConfig<Input, Output, T> extends Config<Input, Output> {
  stage: AnyStage<Input, Output>
  split?: (ctx: Input, iter: number) => T
  reachEnd?: (err: unknown, ctx: Input, iter: number) => boolean
}
