import { Stage } from './stage';
import { AllowedStage, ParallelConfig, StageRun } from './utils/types/types';
export declare class Sequential<R, T, C extends ParallelConfig<R, T> = ParallelConfig<R, T>> extends Stage<R, C> {
    constructor(config?: AllowedStage<R, C>);
    get reportName(): string;
    toString(): string;
    get name(): string;
    compile(rebuild?: boolean): StageRun<R>;
    protected split(ctx: unknown): Array<unknown>;
    protected combine(ctx: unknown, children: Array<unknown>): unknown;
}
//# sourceMappingURL=sequential.d.ts.map