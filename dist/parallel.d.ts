import { Stage } from './stage';
import { AllowedStage, ParallelConfig, StageRun } from './utils/types/types';
export declare class Parallel<R, T, C extends ParallelConfig<R, T> = ParallelConfig<R, T>> extends Stage<R, C> {
    constructor(config?: AllowedStage<R, C>);
    get reportName(): string;
    toString(): string;
    get name(): string;
    compile(rebuild?: boolean): StageRun<R>;
    protected split(ctx: unknown): Array<unknown>;
    protected combine(ctx: unknown, children: Array<unknown>): unknown;
}
export type ParallelErrorInput = {
    stage?: string;
    index: number;
    err: unknown;
    ctx: unknown;
};
export declare class ParallelError extends Error {
    name: string;
    stage?: string;
    index: number;
    err: unknown;
    ctx: unknown;
    constructor(init: ParallelErrorInput);
    toString(): string;
}
//# sourceMappingURL=parallel.d.ts.map