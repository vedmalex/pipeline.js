import { AllowedStage, ContextType, Stage, StageObject, StageRun } from '../../stage';
import { ParallelConfig } from './ParallelConfig';
export declare class Sequential<R extends StageObject, T extends StageObject, C extends ParallelConfig<R, T> = ParallelConfig<R, T>> extends Stage<R, C> {
    constructor(config?: AllowedStage<R, C>);
    get reportName(): string;
    toString(): string;
    get name(): string;
    compile(rebuild?: boolean): StageRun<R>;
    protected split(ctx: ContextType<R>): Array<ContextType<T>>;
    protected combine(ctx: ContextType<R>, children: Array<ContextType<T>>): ContextType<R>;
}
//# sourceMappingURL=Sequential.d.ts.map