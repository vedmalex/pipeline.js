import { Stage } from './stage';
import { AllowedStage, ParallelConfig, Possible, StageObject, StageRun } from './utils/types';
export declare class Sequential<T extends StageObject> extends Stage<T, ParallelConfig<T>> {
    constructor(config?: AllowedStage<T, ParallelConfig<T>>);
    split(ctx: Possible<T>): Array<any>;
    combine(ctx: Possible<T>, children: Array<any>): Possible<T>;
    get reportName(): string;
    toString(): string;
    get name(): string;
    compile(rebuild?: boolean): StageRun<T>;
}
//# sourceMappingURL=sequential.d.ts.map