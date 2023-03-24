import { Stage } from './stage';
import { AnyStage, DoWhileConfig } from './utils/types/types';
import { SingleStageFunction, StageRun } from './utils/types/types';
export declare class DoWhile<R, C extends DoWhileConfig<R>> extends Stage<R, C> {
    constructor();
    constructor(stage: AnyStage);
    constructor(config: C);
    constructor(stageFn: SingleStageFunction<R>);
    get reportName(): string;
    toString(): string;
    reachEnd<T>(err: unknown, ctx: T, iter: number): boolean;
    split<T>(ctx: T, iter: number): any;
    compile(rebuild?: boolean): StageRun<R>;
}
//# sourceMappingURL=dowhile.d.ts.map