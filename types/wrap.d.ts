import { Stage } from './stage';
import { StageObject, AllowedStage, StageRun, WrapConfig } from './utils/types';
export declare class Wrap<T extends StageObject, R extends StageObject> extends Stage<T, WrapConfig<T, R>> {
    constructor(config?: AllowedStage<T, R, WrapConfig<T, R>>);
    get reportName(): string;
    toString(): string;
    compile(rebuild?: boolean): StageRun<T>;
    prepare(ctx: T): unknown;
    finalize(ctx: T, retCtx: R): T;
}
