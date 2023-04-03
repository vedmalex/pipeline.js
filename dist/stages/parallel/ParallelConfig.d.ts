import { AllowedStageStored, ContextType, StageConfig } from '../../stage';
export interface ParallelConfig<R, T> extends StageConfig<R> {
    stage: AllowedStageStored<R, StageConfig<R>>;
    split?: (ctx: ContextType<R>) => T[];
    combine?: ((ctx: ContextType<R>, children: T[]) => R) | ((ctx: ContextType<R>, children: T[]) => unknown);
}
//# sourceMappingURL=ParallelConfig.d.ts.map