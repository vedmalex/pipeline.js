import { ParallelConfig, AllowedStage, StageRun } from './utils/types';
import { Stage } from './stage';
export declare class Sequential<T = any, C extends ParallelConfig<T, R> = any, R = T> extends Stage<T, C, R> {
    constructor(config?: AllowedStage<T, C, R>);
    split(ctx: T | R): Array<any>;
    combine(ctx: T | R, children: Array<any>): T | R;
    get reportName(): string;
    toString(): string;
    get name(): string;
    compile(rebuild?: boolean): StageRun<T, R>;
}
export declare type SequentialError = {
    name: string;
    stage: string;
    index: number;
    err: Error;
    ctx: any;
};
//# sourceMappingURL=sequential.d.ts.map