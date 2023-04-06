import { AnyStage, ComplexError, ContextType, RunPipelineFunction, StageConfig, StageObject } from '../../stage';
export interface RetryOnErrorConfig<R extends StageObject, T extends StageObject> extends StageConfig<R> {
    stage?: AnyStage<R> | RunPipelineFunction<R>;
    retry?: number | (<T>(p1?: ComplexError, p2?: T, p3?: number) => boolean);
    backup?: (ctx: ContextType<R>) => ContextType<T>;
    restore?: (ctx: ContextType<R>, backup: ContextType<T>) => ContextType<R>;
}
//# sourceMappingURL=RetryOnErrorConfig.d.ts.map