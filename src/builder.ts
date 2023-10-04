import { BaseStageConfig, Builder, BuilderDef, BuilderParams } from './base'
import { dowhile, DoWhileBuilder } from './dowhile'
import { empty, EmptyBuilder } from './empty'
import { ERROR } from './errors'
import { ifelse, IfElseBuilder } from './ifelse'
import { rescue, RescueBuilder } from './rescue'
import { retryonerror, RetryOnErrorBuilder } from './retryonerror'
import { stage, StageBuilder } from './stage'
import { timeout, TimeoutBuilder } from './timeout'
import {
  ErrorMessage,
  InferBuilderParams,
  InferDoWhileParams,
  InferIfElseParams,
  InferRescueParams,
  InferRetryOnErrorParams,
  InferStageParams,
  InferTimeoutParams,
  InferWrapParams,
  StageType,
} from './utility'
import { UnsetMarker } from './utility'
import { wrap, WrapBuilder } from './wrap'

export function builder<TConfig extends BaseStageConfig<any, any>>(
  _def: Partial<BuilderDef<TConfig>> = {},
): Builder<InferBuilderParams<{ _type: UnsetMarker }>> {
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
        case input === 'retryonerror':
          return retryonerror(_def as any) as any
        case input === 'dowhile':
          return dowhile(_def as any) as any
        default:
          throw new Error(ERROR.not_implemented)
      }
    },
  }
}

export type GetStage<T extends StageType, TParams extends BuilderParams> = T extends 'stage'
  ? StageBuilder<InferStageParams<TParams>>
  : T extends 'rescue' ? RescueBuilder<InferRescueParams<TParams>>
  : T extends 'wrap' ? WrapBuilder<InferWrapParams<TParams>>
  : T extends 'empty' ? EmptyBuilder
  : T extends 'timeout' ? TimeoutBuilder<InferTimeoutParams<TParams>>
  : T extends 'ifelse' ? IfElseBuilder<InferIfElseParams<TParams>>
  : T extends 'retryonerror' ? RetryOnErrorBuilder<InferRetryOnErrorParams<TParams>>
  : T extends 'dowhile' ? DoWhileBuilder<InferDoWhileParams<TParams>>
  : ErrorMessage<'not implemented'>
