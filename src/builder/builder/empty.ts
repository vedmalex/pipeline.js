import { Empty } from 'src/stages'
import { BaseStageConfig } from '../../stage/StageConfig'
import { BuilderDef, EmptyBuilder } from '../types'

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
