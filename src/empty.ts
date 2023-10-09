import { AbstractStage, BaseStageConfig } from './base'

export class Empty<Input, TConfig extends BaseStageConfig<Input, Input> = BaseStageConfig<Input, Input>>
  extends AbstractStage<Input, Input, TConfig> {
  constructor(config: TConfig) {
    super({ ...config, run: context => context })
  }
}

export function empty(
  _def: BaseStageConfig<any, any> = {},
): EmptyBuilder {
  return {
    _def,
    build() {
      return new Empty(_def) as any
    },
  }
}

export interface EmptyBuilder {
  _def: BaseStageConfig<any, any>
  // где-то теряется тип Params
  build(): Empty<
    any,
    BaseStageConfig<any, any>
  >
}
