import { Stage } from './stage';
import { ContextType } from './context';
import { AllowedStage, ParallelConfig, StageObject, StageRun } from './utils/types';
export declare class Parallel<T extends StageObject, R extends StageObject> extends Stage<T, ParallelConfig<T, R>> {
    constructor(config?: AllowedStage<T, R, ParallelConfig<T, R>>);
    split(ctx: ContextType<T>): Array<ContextType<R>>;
    combine(ctx: ContextType<T>, children: Array<ContextType<R>>): ContextType<T>;
    get reportName(): string;
    toString(): string;
    get name(): string;
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
//# sourceMappingURL=parallel.d.ts.map