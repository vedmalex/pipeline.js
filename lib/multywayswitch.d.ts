import { Stage } from './stage';
import { AllowedStage, Func1, Func1Sync, Func2Sync, RunPipelineFunction } from './utils/types';
import { StageConfig, StageRun } from './utils/types';
export declare type MultyWaySwitchCase<T, R> = MultyWaySwitchCaseStatic<T, R> | MultyWaySwitchCaseDynamic<T, R>;
export interface MultyWaySwitchCaseStatic<T, R> {
    stage: Stage<T, any, R> | RunPipelineFunction<T, R>;
    evaluate: boolean;
    split?: Func1Sync<Array<any>, T>;
    combine?: Func2Sync<T | R | void, T, any>;
}
export interface MultyWaySwitchCaseDynamic<T, R> {
    stage: Stage<T, any, R> | RunPipelineFunction<T, R>;
    evaluate: Func1<boolean, T>;
    split?: Func1Sync<any, T>;
    combine?: Func2Sync<T | R | void, T, any>;
}
export declare function isMultyWaySwitchCase<T, R>(inp: unknown): inp is MultyWaySwitchCase<T, R>;
export interface MultyWaySwitchConfig<T, R> extends StageConfig<T, R> {
    cases: Array<MultyWaySwitchCase<T, R>>;
    split?: Func1Sync<Array<any>, T>;
    combine?: Func2Sync<T | R | void, T, Array<any>>;
}
export declare type AllowedMWS<T, C, R> = AllowedStage<T, C, R> | Array<Stage<T, any, R> | RunPipelineFunction<T, R> | MultyWaySwitchCase<T, R>>;
export declare function getMultyWaySwitchConfig<T, R>(config: AllowedMWS<T, Partial<MultyWaySwitchConfig<T, R>>, R>): MultyWaySwitchConfig<T, R>;
export declare class MultyWaySwitch<T, R> extends Stage<T, MultyWaySwitchConfig<T, R>, R> {
    constructor(config?: AllowedStage<T, MultyWaySwitchConfig<T, R>, R>);
    get reportName(): string;
    toString(): string;
    compile(rebuild?: boolean): StageRun<T, R>;
}
export declare type MWSError = {
    name: string;
    stage: string;
    index: number;
    err: Error;
    ctx: any;
};
//# sourceMappingURL=multywayswitch.d.ts.map