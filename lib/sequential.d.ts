import { Stage } from './stage';
import { AllowedStage, ParallelConfig, Possible, StageObject, StageRun } from './utils/types';
export declare class Sequential<T extends StageObject, R extends StageObject = T> extends Stage<T, ParallelConfig<T, R>, R> {
    constructor(config?: AllowedStage<T, ParallelConfig<T, R>, R>);
    split(ctx: Possible<T>): Array<any>;
    combine(ctx: Possible<T>, children: Array<any>): Possible<R>;
    get reportName(): string;
    toString(): string;
    get name(): string;
    compile(rebuild?: boolean): StageRun<T, R>;
}
//# sourceMappingURL=sequential.d.ts.map