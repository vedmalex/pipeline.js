import { Stage } from './stage';
import { Possible } from './utils/types';
import { StageRun, AllowedStage, WrapConfig } from './utils/types';
export declare class Wrap<T, R = T> extends Stage<T, WrapConfig<T, R>, R> {
    constructor(config?: AllowedStage<T, WrapConfig<T, R>, R>);
    get reportName(): string;
    toString(): string;
    compile(rebuild?: boolean): StageRun<T, R>;
    prepare(ctx: Possible<T>): unknown;
    finalize(ctx: Possible<T>, retCtx: unknown): Possible<R>;
}
//# sourceMappingURL=wrap.d.ts.map