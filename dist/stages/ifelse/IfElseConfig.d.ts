import { AnyStage, RunPipelineFunction, StageConfig, StageObject, ValidateFunction } from '../../stage';
export interface IfElseConfig<R extends StageObject> extends StageConfig<R> {
    condition?: boolean | ValidateFunction<R>;
    success?: AnyStage<R> | RunPipelineFunction<R>;
    failed?: AnyStage<R> | RunPipelineFunction<R>;
}
//# sourceMappingURL=IfElseConfig.d.ts.map