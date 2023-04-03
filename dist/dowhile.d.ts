import { Stage } from './stage';
import { AnyStage, DoWhileConfig } from './utils/types';
import { StageRun } from './utils/types';
import { SingleStageFunction } from './utils/types/stage/SingleStageFunction';
export declare class DoWhile<R, T, C extends DoWhileConfig<R, T> = DoWhileConfig<R, T>> extends Stage<R, C> {
    constructor();
    constructor(stage: AnyStage<R>);
    constructor(config: C);
    constructor(stageFn: SingleStageFunction<R>);
    get reportName(): string;
    toString(): string;
    protected reachEnd(err: unknown, ctx: unknown, iter: number): boolean;
    protected split(ctx: unknown, iter: number): any;
    compile(rebuild?: boolean): StageRun<R>;
}
//# sourceMappingURL=dowhile.d.ts.map