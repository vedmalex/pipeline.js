import { Stage } from './stage';
import { AllowedStage, ParallelConfig, StageObject, StageRun } from './utils/types';
export declare class Sequential<T extends StageObject, R extends StageObject> extends Stage<T, ParallelConfig<T, R>> {
    constructor(config?: AllowedStage<T, R, ParallelConfig<T, R>>);
    split(ctx: T): Array<R>;
    combine(ctx: T, children: Array<R>): T;
    get reportName(): string;
    toString(): string;
    get name(): string;
    compile(rebuild?: boolean): StageRun<T>;
}
//# sourceMappingURL=sequential.d.ts.map