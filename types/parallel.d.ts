import { Stage } from './stage';
import { AllowedStage, ParallelJoinMode, ParallelConfig, ParallelTrailingMode, StageObject, StageRun } from './utils/types';
export declare class Parallel<T extends StageObject, R extends StageObject> extends Stage<T, ParallelConfig<T, R>> {
    constructor(config?: AllowedStage<T, R, ParallelConfig<T, R>>);
    split(ctx: T): Array<R>;
    combine(ctx: T, children: Array<R>): T;
    get reportName(): string;
    toString(): string;
    get name(): string;
    get concurrency(): number | undefined;
    get join(): ParallelJoinMode;
    get quorum(): number | undefined;
    get trailing(): ParallelTrailingMode;
    get trailingTimeout(): number | undefined;
    compile(rebuild?: boolean): StageRun<T>;
}
export type ParallelErrorInput = {
    stage?: string;
    index: number;
    err: Error;
    ctx: any;
};
export declare class ParallelError<T> extends Error {
    name: string;
    stage?: string;
    index: number;
    err: Error;
    ctx: T;
    constructor(init: ParallelErrorInput);
    toString(): string;
}
export declare function normalizeParallelConcurrency(concurrency?: number): number | undefined;
export declare function normalizeParallelJoin(join?: ParallelJoinMode): ParallelJoinMode;
export declare function normalizeParallelQuorum(quorum?: number): number | undefined;
export declare function normalizeParallelTrailing(join: ParallelJoinMode, trailing?: ParallelTrailingMode): ParallelTrailingMode;
export declare function normalizeParallelTrailingTimeout(trailingTimeout?: number): number | undefined;
export declare function resolveParallelSuccessTarget(join: ParallelJoinMode, quorum: number | undefined, childCount: number): number;
