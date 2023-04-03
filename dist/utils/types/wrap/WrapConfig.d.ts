import { ContextType } from 'src/context';
import { StageConfig as StageConfig } from '../../../stage/StageConfig';
import { AllowedStageStored } from '../../../stage/AllowedStageStored';
export interface WrapConfig<R, T> extends StageConfig<R> {
    stage: AllowedStageStored<R, StageConfig<R>>;
    prepare?: (ctx: ContextType<R>) => T;
    finalize?: ((ctx: R, retCtx: T) => R) | ((ctx: R, retCtx: T) => void);
}
//# sourceMappingURL=WrapConfig.d.ts.map