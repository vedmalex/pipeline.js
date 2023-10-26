import { AllowedStageStored, Config } from '../../stage';
export interface DoWhileConfig<Input, Output, T> extends Config<Input, Output> {
    stage: AllowedStageStored<Input, Output, Config<Input, Output>>;
    split?: (ctx: Output, iter: number) => T;
    reachEnd?: (err: unknown, ctx: Input, iter: number) => unknown;
}
