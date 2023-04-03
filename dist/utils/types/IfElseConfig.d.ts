import { StageConfig as StageConfig } from './StageConfig';
import { RunPipelineFunction } from './RunPipelineFunction';
import { ValidateFunction } from './ValidateFunction';
import { AnyStage } from './stage/AnyStage';
export interface IfElseConfig<R> extends StageConfig<R> {
    condition?: boolean | ValidateFunction<R>;
    success?: AnyStage<R> | RunPipelineFunction<R>;
    failed?: AnyStage<R> | RunPipelineFunction<R>;
}
//# sourceMappingURL=IfElseConfig.d.ts.map