import { Stage } from './stage';
import { SingleStageFunction, StageConfig, StageRun, Func2Sync, Func3Sync } from './utils/types';
export interface DoWhileConfig<T, C, R> extends StageConfig<T, R> {
    stage: Stage<T, C, R> | SingleStageFunction<T>;
    split?: Func2Sync<T | R, T | R, number>;
    reachEnd?: Func3Sync<boolean, Error | undefined, T | R, number>;
}
export declare class DoWhile<T = any, C extends DoWhileConfig<T, C, R> = any, R = T> extends Stage<T, C, R> {
    stages: Array<Stage<any, any, any>>;
    constructor(_config?: C | Stage<T, C, R> | SingleStageFunction<T>);
    get reportName(): string;
    toString(): string;
    reachEnd(err: Error | undefined, ctx: T | R, iter: number): boolean;
    split(ctx: T | R, iter: number): T | R;
    compile(rebuild?: boolean): StageRun<T, R>;
}
//# sourceMappingURL=dowhile.d.ts.map