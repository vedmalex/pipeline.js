import { BaseStageConfig } from '../../stage'
import { AbstractStage } from '../../stage/AbstractStage'
export class Empty<Input, TConfig extends BaseStageConfig<Input, Input> = BaseStageConfig<Input, Input>>
  extends AbstractStage<Input, Input, TConfig> {
  constructor(config: TConfig) {
    super({ ...config, run: context => context })
  }
}
