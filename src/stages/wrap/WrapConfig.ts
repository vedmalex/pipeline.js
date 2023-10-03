import { StageConfig } from '../../stage'
import { AbstractStage } from '../../stage/AbstractStage'

export interface WrapConfig<Input, Output, IInput, IOutput> extends StageConfig<Input, Output> {
  stage: AbstractStage<IInput, IOutput>
  prepare?: (ctx: Input) => IInput
  finalize?: (ctx: Input, retCtx: IOutput) => Output
}
