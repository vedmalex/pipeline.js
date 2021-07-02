import { ParallelConfig, AllowedStage, StageRun } from './utils/types';
import { Stage } from './stage';
export declare class Parallel<T, C extends ParallelConfig<T, R>, R> extends Stage<T, C, R> {
    constructor(config?: AllowedStage<T, C, R>);
    split(ctx: T | R): Array<any>;
    combine(ctx: T | R, children: Array<any>): T | R;
    get reportName(): string;
    toString(): string;
    get name(): string;
    compile(rebuild?: boolean): StageRun<T, R>;
}
export declare type ParallelError = {
    name: string;
    stage: string;
    index: number;
    err: Error;
    ctx: any;
};
export declare class StageError<T extends {
    name: string;
}> extends Error {
    info: T;
    constructor(err: T);
}
//# sourceMappingURL=parallel%20copy.d.ts.map