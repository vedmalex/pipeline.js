import { Stage } from './stage';
import { ComplexError } from './utils/ErrorList';
import { AnyStage, Func2Sync, Func3Sync, Possible, SingleStageFunction, StageConfig, StageObject, StageRun } from './utils/types';
export interface DoWhileConfig<T extends StageObject> extends StageConfig<T> {
    stage: AnyStage<T> | SingleStageFunction<T>;
    split?: Func2Sync<T, Possible<T>, number>;
    reachEnd?: Func3Sync<boolean, Possible<ComplexError>, Possible<T>, number>;
}
export declare class DoWhile<T extends StageObject> extends Stage<T, DoWhileConfig<T>> {
    constructor();
    constructor(stage: Stage<T, StageConfig<T>>);
    constructor(config: DoWhileConfig<T>);
    constructor(stageFn: SingleStageFunction<T>);
    get reportName(): string;
    toString(): string;
    reachEnd(err: Possible<ComplexError>, ctx: Possible<T>, iter: number): boolean;
    split(ctx: Possible<T>, iter: number): any;
    compile(rebuild?: boolean): StageRun<any>;
}
//# sourceMappingURL=dowhile.d.ts.map