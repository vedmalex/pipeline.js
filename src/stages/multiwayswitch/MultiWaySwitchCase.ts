import { AnyStage, Config, Stage, StageEvaluateFunction } from '../../stage'
import { CombineFunction } from './CombineFunction'
import { SplitFunction } from './SplitFunction'

export class MultiWaySwitchCase<
  SInput,
  SOutput,
  Input = unknown,
  Output = unknown,
  Config extends MultWaySwitchCaseConfig<SInput, SOutput, Input, Output> = MultWaySwitchCaseConfig<
    SInput,
    SOutput,
    Input,
    Output
  >,
> extends Stage<Input, Output, Config> {
}

export interface MultWaySwitchCaseConfig<SInput, SOutput, Input, Output> extends Config<Input, Output> {
  stage: AnyStage<SInput, SOutput>
  evaluate: StageEvaluateFunction<SInput>
  split?: SplitFunction<SInput, Input>
  combine?: CombineFunction<SInput, SOutput, Output>
}
