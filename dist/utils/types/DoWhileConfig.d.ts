import { ContextType } from 'src/context';
import { StageConfig as StageConfig } from './StageConfig';
import { AllowedStageStored } from './stage/AllowedStageStored';
export interface DoWhileConfig<R, T> extends StageConfig<R> {
    stage: AllowedStageStored<R, StageConfig<R>>;
    split?: (ctx: ContextType<R>, iter: number) => T;
    reachEnd?: (err: unknown, ctx: ContextType<R>, iter: number) => unknown;
}
//# sourceMappingURL=DoWhileConfig.d.ts.map