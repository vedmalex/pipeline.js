import { Stage } from './stage';
import { AnyStage, Func2Sync, Func3Sync, Possible, SingleStageFunction, StageConfig, StageObject, StageRun } from './utils/types';
export interface DoWhileConfig<T extends StageObject> extends StageConfig<T> {
    stage: AnyStage<any> | SingleStageFunction<any>;
    split?: Func2Sync<any, Possible<T>, number>;
    reachEnd?: Func3Sync<boolean, Possible<Error>, Possible<T>, number>;
}
export declare class DoWhile<T extends StageObject> extends Stage<T, DoWhileConfig<T>> {
    constructor();
    get reportName(): string;
    toString(): string;
    reachEnd(err: Possible<Error>, ctx: Possible<T>, iter: number): boolean;
    split(ctx: Possible<T>, iter: number): any;
    compile(rebuild?: boolean): StageRun<any>;
}
//# sourceMappingURL=dowhile.d.ts.map