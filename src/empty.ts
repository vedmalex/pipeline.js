import { AbstractStage, BaseStageConfig, BuilderDef } from './base'

export class Empty<Input, TConfig extends BaseStageConfig<Input, Input> = BaseStageConfig<Input, Input>>
  extends AbstractStage<Input, Input, TConfig> {
  constructor(config: TConfig) {
    super({ ...config, run: context => context })
  }
}

export function empty<TConfig extends BaseStageConfig<any, any>>(
  _def: Partial<BuilderDef<TConfig>> = {},
): EmptyBuilder {
  return {
    _def: _def as BuilderDef<TConfig>,
    build() {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      return new Empty(_def.cfg) as any
    },
  }
}

export interface EmptyBuilder {
  _def: BuilderDef<BaseStageConfig<any, any>>
  // где-то теряется тип Params
  build(): Empty<
    any,
    BaseStageConfig<any, any>
  >
}
