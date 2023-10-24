import { AbstractStage, BaseStageConfig } from './base'

export class Empty<Input, TConfig extends BaseStageConfig<Input, Input> = BaseStageConfig<Input, Input>>
  extends AbstractStage<Input, Input, TConfig> {
  constructor(config: TConfig) {
    super({ ...config, run: ({ input }) => input })
  }
}

export function empty(
  config: BaseStageConfig<any, any> = {},
): EmptyBuilder {
  return {
    config,
    build() {
      return new Empty(config) as any
    },
  }
}

export interface EmptyBuilder {
  config: BaseStageConfig<any, any>
  // где-то теряется тип Params
  build(): Empty<
    any,
    BaseStageConfig<any, any>
  >
}
