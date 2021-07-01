import { Stage } from './stage';
import { StageRun, AllowedStage, WrapConfig } from './utils/types';
export declare class Wrap<T = any, C extends WrapConfig<T, R> = any, R = T> extends Stage<T, C, R> {
    stages: Array<Stage<any, any, any>>;
    constructor(config?: AllowedStage<T, C, R>);
    get reportName(): string;
    toString(): string;
    compile(rebuild?: boolean): StageRun<T, R>;
    prepare(ctx: T): T;
    finalize(ctx: T, retCtx: R): T | R;
}
//# sourceMappingURL=wrap.d.ts.map