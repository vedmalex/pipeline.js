import { Builder, BuilderParams } from './base';
import { DoWhileBuilder } from './dowhile';
import { EmptyBuilder } from './empty';
import { IfElseBuilder } from './ifelse';
import { MultiWaySwitchBuilder, MultiWaySwitchCaseBuilder } from './multiwayswitch';
import { PipelineBuilder } from './pipeline';
import { RescueBuilder } from './rescue';
import { RetryOnErrorBuilder } from './retryonerror';
import { SequentialBuilder } from './sequential';
import { StageBuilder } from './stage';
import { TimeoutBuilder } from './timeout';
import { ErrorMessage, InferBuilderParams, InferDoWhileParams, InferIfElseParams, InferMultiWaySwitchCaseParams, InferMultiWaySwitchParams, InferRescueParams, InferRetryOnErrorParams, InferSequentialParams, InferStageParams, InferTimeoutParams, InferWrapParams, StageType } from './utility';
import { UnsetMarker } from './utility';
import { WrapBuilder } from './wrap';
export declare function builder(): Builder<InferBuilderParams<{
    _type: UnsetMarker;
}>>;
export type GetStage<T extends StageType, TParams extends BuilderParams> = T extends 'stage' ? StageBuilder<InferStageParams<TParams>> : T extends 'rescue' ? RescueBuilder<InferRescueParams<TParams>> : T extends 'wrap' ? WrapBuilder<InferWrapParams<TParams>> : T extends 'empty' ? EmptyBuilder : T extends 'timeout' ? TimeoutBuilder<InferTimeoutParams<TParams>> : T extends 'ifelse' ? IfElseBuilder<InferIfElseParams<TParams>> : T extends 'retryonerror' ? RetryOnErrorBuilder<InferRetryOnErrorParams<TParams>> : T extends 'dowhile' ? DoWhileBuilder<InferDoWhileParams<TParams>> : T extends 'pipeline' ? PipelineBuilder<InferDoWhileParams<TParams>> : T extends 'sequential' ? SequentialBuilder<InferSequentialParams<TParams>> : T extends 'multiwayswitch' ? MultiWaySwitchBuilder<InferMultiWaySwitchParams<TParams>> : T extends 'multiwayswitchcase' ? MultiWaySwitchCaseBuilder<InferMultiWaySwitchCaseParams<TParams>> : ErrorMessage<'not implemented'>;
