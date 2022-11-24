import { Stage } from './stage';
import { Possible, StageObject } from './utils/types';
import { AllowedStage, StageRun, WrapConfig } from './utils/types';
export declare class Wrap<T extends StageObject> extends Stage<T, WrapConfig<T>> {
    constructor(config?: AllowedStage<T, WrapConfig<T>>);
    get reportName(): string;
    toString(): string;
    compile(rebuild?: boolean): StageRun<T>;
    prepare(ctx: Possible<T>): Possible<T>;
    finalize(ctx: Possible<T>, retCtx: Possible<T>): Possible<T>;
}
//# sourceMappingURL=wrap.d.ts.map