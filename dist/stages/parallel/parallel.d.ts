import { AllowedStage, Stage, StageRun } from '../../stage';
import { ParallelConfig } from './ParallelConfig';
export declare class Parallel<R, T, C extends ParallelConfig<R, T> = ParallelConfig<R, T>> extends Stage<R, C> {
    constructor(config?: AllowedStage<R, C>);
    get reportName(): string;
    toString(): string;
    get name(): string;
    compile(rebuild?: boolean): StageRun<R>;
    protected split(ctx: unknown): Array<unknown>;
    protected combine(ctx: unknown, children: Array<unknown>): unknown;
}
//# sourceMappingURL=Parallel.d.ts.map