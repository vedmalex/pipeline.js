import { Stage } from './stage';
import { AllowedStage, AnyStage, Func1, Func1Sync, Func2Sync, RunPipelineFunction, StageObject } from './utils/types';
import { Possible, StageConfig, StageRun } from './utils/types';
export type MultiWaySwitchCase<T extends StageObject> = MultiWaySwitchStatic<T> | MultiWaySwitchDynamic<T>;
export interface MultiWaySwitchStatic<T extends StageObject> {
    stage: AnyStage<T> | RunPipelineFunction<T>;
    evaluate?: boolean;
    split?: Func1Sync<any, Possible<T>>;
    combine?: Func2Sync<Possible<T>, Possible<T>, any>;
}
export interface MultiWaySwitchDynamic<T extends StageObject> {
    stage: AnyStage<T> | RunPipelineFunction<T>;
    evaluate: Func1<boolean, T>;
    split?: Func1Sync<any, Possible<T>>;
    combine?: Func2Sync<Possible<T>, Possible<T>, any>;
}
export declare function isMultiWaySwitch<T extends StageObject>(inp: object): inp is MultiWaySwitchCase<T>;
export interface MultWaySwitchConfig<T extends StageObject> extends StageConfig<T> {
    cases: Array<MultiWaySwitchCase<T>>;
    split?: Func1Sync<any, Possible<T>>;
    combine?: Func2Sync<Possible<T>, Possible<T>, any>;
}
export type AllowedMWS<T extends StageObject, C extends StageConfig<T>> = AllowedStage<T, C> | Array<Stage<T, C> | RunPipelineFunction<T> | MultiWaySwitchCase<T>>;
export declare function getMultWaySwitchConfig<T extends StageObject>(config: AllowedMWS<T, Partial<MultWaySwitchConfig<T>>>): MultWaySwitchConfig<T>;
export declare class MultiWaySwitch<T extends StageObject> extends Stage<T, MultWaySwitchConfig<T>> {
    constructor(config?: AllowedStage<T, MultWaySwitchConfig<T>>);
    get reportName(): string;
    toString(): string;
    combine(ctx: Possible<T>, retCtx: any): Possible<T>;
    combineCase(item: MultiWaySwitchCase<T>, ctx: Possible<T>, retCtx: any): Possible<T>;
    split(ctx: Possible<T>): any;
    splitCase(item: {
        split?: Func1Sync<any, Possible<T>>;
    }, ctx: Possible<T>): any;
    compile(rebuild?: boolean): StageRun<T>;
}
//# sourceMappingURL=multiwayswitch.d.ts.map