import { Stage } from './stage';
import { AllowedStage, Func1, Func1Sync, Func2Sync, RunPipelineFunction } from './utils/types';
import { StageConfig, StageRun } from './utils/types';
export declare type MultiWaySwitchCase<T, R> = MultiWaySwitchStatic<T, R> | MultiWaySwitchDynamic<T, R>;
export interface MultiWaySwitchStatic<T, R> {
    stage: Stage<T, any, R> | RunPipelineFunction<T, R>;
    evaluate: boolean;
    split?: Func1Sync<any, T | R>;
    combine?: Func2Sync<T | R, T | R, any>;
}
export interface MultiWaySwitchDynamic<T, R> {
    stage: Stage<T, any, R> | RunPipelineFunction<T, R>;
    evaluate: Func1<boolean, T>;
    split?: Func1Sync<any, T | R>;
    combine?: Func2Sync<T | R, T | R, any>;
}
export declare function isMultiWaySwitch<T, R>(inp: unknown): inp is MultiWaySwitchCase<T, R>;
export interface MultWaySwitchConfig<T, R> extends StageConfig<T, R> {
    cases: Array<MultiWaySwitchCase<T, R>>;
    split?: Func1Sync<any, T | R>;
    combine?: Func2Sync<T | R, T | R, any>;
}
export declare type AllowedMWS<T, C, R> = AllowedStage<T, C, R> | Array<Stage<T, any, R> | RunPipelineFunction<T, R> | MultiWaySwitchCase<T, R>>;
export declare function getMultWaySwitchConfig<T, R>(config: AllowedMWS<T, Partial<MultWaySwitchConfig<T, R>>, R>): MultWaySwitchConfig<T, R>;
export declare class MultiWaySwitch<T = any, R = T> extends Stage<T, MultWaySwitchConfig<T, R>, R> {
    constructor(config?: AllowedStage<T, MultWaySwitchConfig<T, R>, R>);
    get reportName(): string;
    toString(): string;
    combine(ctx: T | R, retCtx: any): T | R;
    combineCase(item: {
        combine?: Func2Sync<T | R, T | R, any>;
    }, ctx: T, retCtx: any): T | R;
    split(ctx: T | R): T | R;
    splitCase(item: {
        split?: Func1Sync<any, T | R>;
    }, ctx: T): T | R;
    compile(rebuild?: boolean): StageRun<T, R>;
}
export declare type MWSError = {
    name: string;
    stage: string;
    index: number;
    err: Error;
    ctx: any;
};
//# sourceMappingURL=multiwayswitch.d.ts.map