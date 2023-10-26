import { AnyStage, SingleStageFunction } from '../../stage';
import { DoWhileConfig } from './DoWhileConfig';
export declare function getDoWhileConfig<Input, Output, T, Config extends DoWhileConfig<Input, Output, T>>(_config: AnyStage<Input, Output> | Config | SingleStageFunction<Input, Output>): Config;
