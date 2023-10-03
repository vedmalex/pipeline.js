import { AbstractStage } from '../../stage/AbstractStage'
import { validatorWrapConfig, WrapConfig } from './WrapConfig'

async function processIt<
  Input,
  Output,
  IInput,
  IOutput,
  Config extends WrapConfig<Input, Output, IInput, IOutput> = WrapConfig<
    Input,
    Output,
    IInput,
    IOutput
  >,
>(
  this: Wrap<Input, Output, IInput, IOutput, Config>,
  input: Input,
): Promise<Output> {
  let prepared: IInput
  if (this.config.prepare) {
    prepared = await this.config.prepare(input)
  } else {
    prepared = input as unknown as IInput
  }
  const stageResult = await this.config.stage.exec(prepared)
  let result: Output
  if (this.config.finalize) {
    result = await this.config.finalize(input, stageResult)
  } else {
    result = stageResult as unknown as Output
  }
  return result
}

export class Wrap<
  Input,
  Output,
  IInput,
  IOutput,
  Config extends WrapConfig<Input, Output, IInput, IOutput> = WrapConfig<
    Input,
    Output,
    IInput,
    IOutput
  >,
> extends AbstractStage<Input, Output, Config> {
  constructor(cfg: Config) {
    super({ ...cfg, run: processIt })
    this.config = validatorWrapConfig(this.config).parse(this.config) as unknown as Config
  }
}
