import { Stage } from './stage';
import { IStage, SingleStageFunction, StageConfig, StageRun, Func3, Func2 } from './utils/types';
export interface DoWhileConfig<T, C, R> extends StageConfig<T, R> {
    stage: IStage<T, C, R> | SingleStageFunction<T>;
    split?: Func2<T | R, T | R, number>;
    reachEnd?: Func3<boolean, Error | undefined, T | R, number>;
}
export declare class DoWhile<T, C extends DoWhileConfig<T, C, R>, R> extends Stage<T, C, R> {
    stages: Array<IStage<any, any, any>>;
    constructor(config: C);
    get reportName(): string;
    toString(): string;
    compile(rebuild?: boolean): StageRun<T, R>;
}
//# sourceMappingURL=dowhile.d.ts.map