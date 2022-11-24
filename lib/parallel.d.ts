import { Stage } from './stage';
import { AllowedStage, ParallelConfig, Possible, StageObject, StageRun } from './utils/types';
export declare class Parallel<T extends StageObject> extends Stage<T, ParallelConfig<T>> {
    constructor(config?: AllowedStage<T, ParallelConfig<T>>);
    split(ctx: Possible<T>): Array<any>;
    combine(ctx: T, children: Array<any>): T;
    get reportName(): string;
    toString(): string;
    get name(): string;
    compile(rebuild?: boolean): StageRun<T>;
}
export type ParallelError = {
    name: string;
    stage: string;
    index: number;
    err: Error;
    ctx: any;
};
//# sourceMappingURL=parallel.d.ts.map