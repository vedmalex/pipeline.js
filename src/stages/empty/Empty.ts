import { Config, Stage } from '../../stage'
export class Empty<Input, Output, TConfig extends Config<Input, Output> = Config<Input, Output>>
  extends Stage<Input, Output, TConfig> {
}
