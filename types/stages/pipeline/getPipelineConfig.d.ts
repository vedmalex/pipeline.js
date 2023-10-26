import { AllowedPipeline } from './AllowedPipeline';
import { PipelineConfig } from './PipelineConfig';
export declare function getPipelineConfig<Input, Output, Config extends PipelineConfig<Input, Output>>(config: AllowedPipeline<Input, Output>): Config;
