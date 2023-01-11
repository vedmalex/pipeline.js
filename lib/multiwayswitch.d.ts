import { Stage } from './stage';
import { ContextType } from './context';
import { AllowedStage, AnyStage, Func1, Func1Sync, Func2Sync, RunPipelineFunction, StageObject } from './utils/types';
import { Possible, StageConfig, StageRun } from './utils/types';
export type MultiWaySwitchCase<R extends StageObject, I extends StageObject> = MultiWaySwitchStatic<R, I> | MultiWaySwitchDynamic<R, I>;
export interface MultiWaySwitchStatic<R extends StageObject, I extends StageObject> {
    stage: AnyStage<I, I> | RunPipelineFunction<I>;
    evaluate?: boolean;
    split?: Func1Sync<ContextType<R>, ContextType<I>>;
    combine?: Func2Sync<ContextType<I>, ContextType<R>, any>;
}
export interface MultiWaySwitchDynamic<T extends StageObject, R extends StageObject> {
    stage: AnyStage<R, R> | RunPipelineFunction<R>;
    evaluate: Func1<boolean, R>;
    split?: Func1Sync<ContextType<T>, ContextType<R>>;
    combine?: Func2Sync<ContextType<R>, ContextType<R>, any>;
}
export declare function isMultiWaySwitch<T extends StageObject, R extends StageObject>(inp: object): inp is MultiWaySwitchCase<T, R>;
export interface MultWaySwitchConfig<T extends StageObject, R extends StageObject> extends StageConfig<T> {
    cases: Array<MultiWaySwitchCase<R, StageObject>>;
    split?: Func1Sync<ContextType<R>, ContextType<StageObject>>;
    combine?: Func2Sync<ContextType<T>, Possible<T>, any>;
}
export type AllowedMWS<T extends StageObject, R extends StageObject, C extends StageConfig<T>> = AllowedStage<T, R, C> | Array<Stage<T, C> | RunPipelineFunction<T> | MultiWaySwitchCase<T, R>>;
export declare function getMultWaySwitchConfig<T extends StageObject, R extends StageObject>(config: AllowedMWS<T, R, Partial<MultWaySwitchConfig<T, R>>>): MultWaySwitchConfig<T, R>;
export declare class MultiWaySwitch<T extends StageObject, R extends StageObject> extends Stage<T, MultWaySwitchConfig<T, R>> {
    constructor(config?: AllowedStage<T, R, MultWaySwitchConfig<T, R>>);
    get reportName(): string;
    toString(): string;
    combine(ctx: ContextType<T>, retCtx: ContextType<R>): ContextType<T>;
    combineCase(item: MultiWaySwitchCase<R, StageObject>, ctx: ContextType<R>, retCtx: ContextType<StageObject>): ContextType<T>;
    split(ctx: ContextType<T>): ContextType<R>;
    splitCase(item: {
        split?: Func1Sync<any, ContextType<T>>;
    }, ctx: ContextType<R>): any;
    compile(rebuild?: boolean): StageRun<T>;
}
//# sourceMappingURL=multiwayswitch.d.ts.map