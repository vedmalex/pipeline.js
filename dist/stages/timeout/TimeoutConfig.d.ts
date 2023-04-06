import { StageConfig, RunPipelineFunction, AnyStage, StageObject, ContextType } from '../../stage';
export interface TimeoutConfig<R extends StageObject> extends StageConfig<R> {
    timeout?: number | ((ctx: ContextType<R>) => number);
    stage?: AnyStage<R> | RunPipelineFunction<R>;
    overdue?: AnyStage<R> | RunPipelineFunction<R>;
}
//# sourceMappingURL=TimeoutConfig.d.ts.map