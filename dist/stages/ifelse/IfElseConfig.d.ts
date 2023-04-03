import { AnyStage, RunPipelineFunction, StageConfig, ValidateFunction } from '../../stage';
export interface IfElseConfig<R> extends StageConfig<R> {
    condition?: boolean | ValidateFunction<R>;
    success?: AnyStage<R> | RunPipelineFunction<R>;
    failed?: AnyStage<R> | RunPipelineFunction<R>;
}
//# sourceMappingURL=IfElseConfig.d.ts.map