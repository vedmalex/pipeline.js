import { Stage } from './stage';
import { AllowedStage, AnyStage, Func1, Func1Sync, Func2Sync, RunPipelineFunction, StageObject } from './utils/types';
import { Possible, StageConfig, StageRun } from './utils/types';
export type MultiWaySwitchCase<T extends StageObject, R extends StageObject> = MultiWaySwitchStatic<T, R> | MultiWaySwitchDynamic<T, R>;
export interface MultiWaySwitchStatic<T extends StageObject, R extends StageObject> {
    stage: AnyStage<T, R> | RunPipelineFunction<T, R>;
    evaluate?: boolean;
    split?: Func1Sync<any, Possible<T>>;
    combine?: Func2Sync<Possible<R>, Possible<T>, any>;
}
export interface MultiWaySwitchDynamic<T extends StageObject, R extends StageObject> {
    stage: AnyStage<T, R> | RunPipelineFunction<T, R>;
    evaluate: Func1<boolean, T>;
    split?: Func1Sync<any, Possible<T>>;
    combine?: Func2Sync<Possible<R>, Possible<T>, any>;
}
export declare function isMultiWaySwitch<T extends StageObject, R extends StageObject>(inp: object): inp is MultiWaySwitchCase<T, R>;
export interface MultWaySwitchConfig<T extends StageObject, R extends StageObject> extends StageConfig<T, R> {
    cases: Array<MultiWaySwitchCase<T, R>>;
    split?: Func1Sync<any, Possible<T>>;
    combine?: Func2Sync<Possible<R>, Possible<T>, any>;
}
export type AllowedMWS<T extends StageObject, C extends StageConfig<T, R>, R extends StageObject> = AllowedStage<T, C, R> | Array<Stage<T, C, R> | RunPipelineFunction<T, R> | MultiWaySwitchCase<T, R>>;
export declare function getMultWaySwitchConfig<T extends StageObject, R extends StageObject>(config: AllowedMWS<T, Partial<MultWaySwitchConfig<T, R>>, R>): MultWaySwitchConfig<T, R>;
export declare class MultiWaySwitch<T extends StageObject, R extends StageObject = T> extends Stage<T, MultWaySwitchConfig<T, R>, R> {
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