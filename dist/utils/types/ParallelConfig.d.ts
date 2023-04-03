import { ContextType } from 'src/context';
import { StageConfig as StageConfig } from './StageConfig';
import { AllowedStageStored } from './stage/AllowedStageStored';
export interface ParallelConfig<R, T> extends StageConfig<R> {
    stage: AllowedStageStored<R, StageConfig<R>>;
    split?: (ctx: ContextType<R>) => T[];
    combine?: ((ctx: ContextType<R>, children: T[]) => R) | ((ctx: ContextType<R>, children: T[]) => unknown);
}
//# sourceMappingURL=ParallelConfig.d.ts.map