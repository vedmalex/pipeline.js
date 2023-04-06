import { AllowedStageStored, ContextType, StageConfig, StageObject } from '../../stage';
export interface ParallelConfig<R extends StageObject, T extends StageObject> extends StageConfig<R> {
    stage: AllowedStageStored<R, StageConfig<R>>;
    split?: (ctx: ContextType<R>) => Array<ContextType<T>>;
    combine?: (ctx: ContextType<R>, children: Array<ContextType<T>>) => ContextType<R>;
}
//# sourceMappingURL=ParallelConfig.d.ts.map