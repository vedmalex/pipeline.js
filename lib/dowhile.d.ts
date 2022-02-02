import { Stage } from './stage';
import { AnyStage, Func2Sync, Func3Sync, Possible, SingleStageFunction, StageConfig, StageRun } from './utils/types';
export interface DoWhileConfig<T, R> extends StageConfig<T, R> {
    stage: AnyStage<any, any> | SingleStageFunction<any, any>;
    split?: Func2Sync<any, Possible<T>, number>;
    reachEnd?: Func3Sync<boolean, Possible<Error>, Possible<T>, number>;
}
export declare class DoWhile<T, R = T> extends Stage<T, DoWhileConfig<T, R>, R> {
    constructor(_config?: DoWhileConfig<T, R> | Stage<T, DoWhileConfig<T, R>, R> | SingleStageFunction<T, R>);
    get reportName(): string;
    toString(): string;
    reachEnd(err: Possible<Error>, ctx: Possible<T>, iter: number): boolean;
    split(ctx: Possible<T>, iter: number): any;
    compile(rebuild?: boolean): StageRun<any, any>;
}
//# sourceMappingURL=dowhile.d.ts.map