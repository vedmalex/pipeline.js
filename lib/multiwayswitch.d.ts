import { Stage } from './stage';
import { AllowedStage, Func1, Func1Sync, Func2Sync, RunPipelineFunction, AnyStage } from './utils/types';
import { StageConfig, StageRun, Possible } from './utils/types';
export declare type MultiWaySwitchCase<T, R> = MultiWaySwitchStatic<T, R> | MultiWaySwitchDynamic<T, R>;
export interface MultiWaySwitchStatic<T, R> {
    stage: AnyStage<T, R> | RunPipelineFunction<T, R>;
    evaluate?: boolean;
    split?: Func1Sync<any, Possible<T>>;
    combine?: Func2Sync<Possible<R>, Possible<T>, any>;
}
export interface MultiWaySwitchDynamic<T, R> {
    stage: AnyStage<T, R> | RunPipelineFunction<T, R>;
    evaluate: Func1<boolean, T>;
    split?: Func1Sync<any, Possible<T>>;
    combine?: Func2Sync<Possible<R>, Possible<T>, any>;
}
export declare function isMultiWaySwitch<T, R>(inp: unknown): inp is MultiWaySwitchCase<T, R>;
export interface MultWaySwitchConfig<T, R> extends StageConfig<T, R> {
    cases: Array<MultiWaySwitchCase<T, R>>;
    split?: Func1Sync<any, Possible<T>>;
    combine?: Func2Sync<Possible<R>, Possible<T>, any>;
}
export declare type AllowedMWS<T, C, R> = AllowedStage<T, C, R> | Array<Stage<T, C, R> | RunPipelineFunction<T, R> | MultiWaySwitchCase<T, R>>;
export declare function getMultWaySwitchConfig<T, R>(config: AllowedMWS<T, Partial<MultWaySwitchConfig<T, R>>, R>): MultWaySwitchConfig<T, R>;
export declare class MultiWaySwitch<T, R = T> extends Stage<T, MultWaySwitchConfig<T, R>, R> {
    constructor(config?: AllowedStage<T, MultWaySwitchConfig<T, R>, R>);
    get reportName(): string;
    toString(): string;
    combine(ctx: Possible<T>, retCtx: any): Possible<R>;
    combineCase(item: MultiWaySwitchCase<T, R>, ctx: Possible<T>, retCtx: any): Possible<R>;
    split(ctx: Possible<T>): any;
    splitCase(item: {
        split?: Func1Sync<any, Possible<T>>;
    }, ctx: Possible<T>): any;
    compile(rebuild?: boolean): StageRun<T, R>;
}
//# sourceMappingURL=multiwayswitch.d.ts.map