import { BaseStageConfig, Builder, BuilderDef } from './base'
import { empty } from './empty'
import { ifelse } from './ifelse'
import { rescue } from './rescue'
import { stage } from './stage'
import { timeout } from './timeout'
import { UnsetMarker } from './utility'
import { wrap } from './wrap'

export function builder<TConfig extends BaseStageConfig<any, any>>(
  _def: Partial<BuilderDef<TConfig>> = {},
): Builder<{
  _type: UnsetMarker
  _input: UnsetMarker
  _output: UnsetMarker
  _run: UnsetMarker
  _stage: UnsetMarker
  _wrapee_input: UnsetMarker
  _wrapee_output: UnsetMarker
}> {
  return {
    _def: _def as BuilderDef<TConfig>,
    type(input) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.type = input
      switch (true) {
        case input === 'stage':
          return stage(_def as any) as any
        case input === 'rescue':
          return rescue(_def as any) as any
        case input === 'wrap':
          return wrap(_def as any) as any
        case input === 'empty':
          return empty(_def as any) as any
        case input === 'timeout':
          return timeout(_def as any) as any
        case input === 'ifelse':
          return ifelse(_def as any) as any
        default:
          throw new Error('not implemented')
      }
    },
  }
}
