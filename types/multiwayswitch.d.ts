import { Stage } from './stage';
import { AllowedStage, AnyStage, Func1, Func1Sync, Func2Sync, RunPipelineFunction, StageObject } from './utils/types';
import { Possible, StageConfig, StageRun } from './utils/types';
export type MultiWaySwitchCase<R extends StageObject, I extends StageObject> = MultiWaySwitchStatic<R, I> | MultiWaySwitchDynamic<R, I>;
export interface MultiWaySwitchStatic<R extends StageObject, I extends StageObject> {
    stage: AnyStage<I, I> | RunPipelineFunction<I>;
    evaluate?: boolean;
    split?: Func1Sync<R, I>;
    combine?: Func2Sync<I, R, any>;
}
export interface MultiWaySwitchDynamic<T extends StageObject, R extends StageObject> {
    stage: AnyStage<R, R> | RunPipelineFunction<R>;
    evaluate: Func1<boolean, R>;
    split?: Func1Sync<T, R>;
    combine?: Func2Sync<R, R, any>;
}
export declare function isMultiWaySwitch<T extends StageObject, R extends StageObject>(inp: object): inp is MultiWaySwitchCase<T, R>;
export interface MultWaySwitchConfig<T extends StageObject, R extends StageObject> extends StageConfig<T> {
    cases: Array<MultiWaySwitchCase<R, StageObject>>;
    split?: Func1Sync<R, StageObject>;
    combine?: Func2Sync<T, Possible<T>, any>;
}
export type AllowedMWS<T extends StageObject, R extends StageObject, C extends StageConfig<T>> = AllowedStage<T, R, C> | Array<Stage<T, C> | RunPipelineFunction<T> | MultiWaySwitchCase<T, R>>;
export declare function getMultWaySwitchConfig<T extends StageObject, R extends StageObject>(config: AllowedMWS<T, R, Partial<MultWaySwitchConfig<T, R>>>): MultWaySwitchConfig<T, R>;
export declare class MultiWaySwitch<T extends StageObject, R extends StageObject> extends Stage<T, MultWaySwitchConfig<T, R>> {
    constructor(config?: AllowedStage<T, R, MultWaySwitchConfig<T, R>>);
    get reportName(): string;
    toString(): string;
    combine(ctx: T, retCtx: R): T;
    combineCase(item: MultiWaySwitchCase<R, StageObject>, ctx: R, retCtx: StageObject): T;
    split(ctx: T): R;
    splitCase(item: {
        split?: Func1Sync<any, T>;
    }, ctx: R): any;
    compile(rebuild?: boolean): StageRun<T>;
}
