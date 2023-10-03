import { AbstractStage } from '../../stage/AbstractStage'
import { RescueConfig, validatorRescueConfig } from './RescueConfig'

async function processIt<Input, Output>(
  this: Rescue<Input, Output>,
  input: Input,
): Promise<Output> {
  try {
    const result = await this.config.stage.exec(input)
    return result
  } catch (err) {
    const rescued = await this.config.rescue(err as Error, input)
    if (!rescued) {
      throw new Error('rescue MUST return value')
    }
    return rescued
  }
}

export class Rescue<
  Input,
  Output,
  Config extends RescueConfig<Input, Output> = RescueConfig<Input, Output>,
> extends AbstractStage<Input, Output, Config> {
  constructor(cfg: Config) {
    super({ ...cfg, run: processIt })
    this.config = validatorRescueConfig(this.config).parse(this.config) as unknown as Config
  }
}
