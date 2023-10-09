import { BaseStageConfig, Builder, BuilderParams } from './base'
import { dowhile, DoWhileBuilder } from './dowhile'
import { empty, EmptyBuilder } from './empty'
import { ERROR } from './error'
import { ifelse, IfElseBuilder } from './ifelse'
import { MultiWaySwitchBuilder, MultiWaySwitchCaseBuilder } from './multiwayswitch'
import { pipeline, PipelineBuilder } from './pipeline'
import { rescue, RescueBuilder } from './rescue'
import { retryonerror, RetryOnErrorBuilder } from './retryonerror'
import { sequential, SequentialBuilder } from './sequential'
import { stage, StageBuilder } from './stage'
import { timeout, TimeoutBuilder } from './timeout'
import {
  ErrorMessage,
  InferBuilderParams,
  InferDoWhileParams,
  InferIfElseParams,
  InferMultiWaySwitchCaseParams,
  InferMultiWaySwitchParams,
  InferRescueParams,
  InferRetryOnErrorParams,
  InferSequentialParams,
  InferStageParams,
  InferTimeoutParams,
  InferWrapParams,
  StageType,
} from './utility'
import { UnsetMarker } from './utility'
import { wrap, WrapBuilder } from './wrap'

export function builder<TConfig extends BaseStageConfig<any, any>>(
  _def?: Partial<TConfig>,
): Builder<InferBuilderParams<{ _type: UnsetMarker }>> {
  return {
    type(input) {
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
        case input === 'pipeline':
          return pipeline(_def as any) as any
        case input === 'sequential':
          return sequential(_def as any) as any
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
  : T extends 'pipeline' ? PipelineBuilder<InferDoWhileParams<TParams>>
  : T extends 'sequential' ? SequentialBuilder<InferSequentialParams<TParams>>
  : T extends 'multiwayswitch' ? MultiWaySwitchBuilder<InferMultiWaySwitchParams<TParams>>
  : T extends 'multiwayswitchcase' ? MultiWaySwitchCaseBuilder<InferMultiWaySwitchCaseParams<TParams>>
  : ErrorMessage<'not implemented'>
