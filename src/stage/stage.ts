import { AbstractStage } from './AbstractStage'
import { StageConfig, validatorStageConfig } from './StageConfig'

export class Stage<Input, Output, TConfig extends StageConfig<Input, Output> = StageConfig<Input, Output>>
  extends AbstractStage<Input, Output> {
  constructor(cfg: TConfig) {
    const config = validatorStageConfig<Input, Output>(cfg).parse(cfg) as StageConfig<Input, Output>
    super(config)
  }
}
