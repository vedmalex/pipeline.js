import { Stage } from './stage';
import { Possible, StageObject, AllowedStage, StageRun, WrapConfig } from './utils/types';
export declare class Wrap<T extends StageObject> extends Stage<T, WrapConfig<T>> {
    constructor(config?: AllowedStage<T, WrapConfig<T>>);
    get reportName(): string;
    toString(): string;
    compile(rebuild?: boolean): StageRun<T>;
    prepare(ctx: T): T;
    finalize(ctx: Possible<T>, retCtx: Possible<T>): Possible<T>;
}
//# sourceMappingURL=wrap.d.ts.map