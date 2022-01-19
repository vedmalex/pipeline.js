import { ParallelConfig, AllowedStage, StageRun, Possible } from './utils/types';
import { Stage } from './stage';
export declare class Sequential<T, R = T> extends Stage<T, ParallelConfig<T, R>, R> {
    constructor(config?: AllowedStage<T, ParallelConfig<T, R>, R>);
    split(ctx: Possible<T>): Array<any>;
    combine(ctx: Possible<T>, children: Array<any>): Possible<R>;
    get reportName(): string;
    toString(): string;
    get name(): string;
    compile(rebuild?: boolean): StageRun<T, R>;
}
//# sourceMappingURL=sequential.d.ts.map