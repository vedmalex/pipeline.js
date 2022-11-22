import { Stage } from './stage';
import { Possible, StageObject } from './utils/types';
import { AllowedStage, StageRun, WrapConfig } from './utils/types';
export declare class Wrap<T extends StageObject, R extends StageObject = T> extends Stage<T, WrapConfig<T, R>, R> {
    constructor(config?: AllowedStage<T, WrapConfig<T, R>, R>);
    get reportName(): string;
    toString(): string;
    compile(rebuild?: boolean): StageRun<T, R>;
    prepare(ctx: Possible<T>): object;
    finalize(ctx: Possible<T>, retCtx: object): Possible<R>;
}
//# sourceMappingURL=wrap.d.ts.map