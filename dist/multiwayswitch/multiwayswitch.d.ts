import { ContextType } from '../context';
import { Stage } from './stage';
import { AllowedStage, StageEvaluateFunction } from '../utils/types';
import { StageRun, AnyStage } from '../utils/types';
import { StageConfig } from '../stage/StageConfig';
import { RunPipelineFunction } from '../stage/RunPipelineFunction';
export type MultiWaySwitchCase<R, T> = MultiWaySwitchStatic<R, T> | MultiWaySwitchDynamic<R, T>;
export type CombineFunction<R, T> = ((ctx: ContextType<R>, children: T) => R) | ((ctx: ContextType<R>, children: T) => unknown);
export type SplitFunction<R, T> = ((ctx: ContextType<R>) => ContextType<T>) | ((ctx: ContextType<R>) => T);
export interface MultiWaySwitchStatic<R, T> {
    stage: AnyStage<R> | RunPipelineFunction<R>;
    evaluate?: boolean;
    split?: SplitFunction<R, T>;
    combine?: CombineFunction<R, T>;
}
export interface MultiWaySwitchDynamic<R, T> {
    stage: AnyStage<R> | RunPipelineFunction<R> | AllowedStage<R, StageConfig<R>>;
    evaluate: StageEvaluateFunction<R>;
    split?: SplitFunction<R, T>;
    combine?: CombineFunction<R, T>;
}
export declare function isMultiWaySwitch<R, T>(inp: object): inp is MultiWaySwitchCase<R, T>;
export interface MultWaySwitchConfig<R, T> extends StageConfig<R> {
    cases: Array<MultiWaySwitchCase<R, T> | AnyStage<R>>;
    split?: SplitFunction<R, T>;
    combine?: CombineFunction<R, T>;
}
export type AllowedMWS<R, T, C extends StageConfig<R>> = AllowedStage<R, C> | Array<AnyStage<R> | RunPipelineFunction<R> | MultiWaySwitchCase<R, T>>;
export declare function getMultWaySwitchConfig<R, T, C extends MultWaySwitchConfig<R, T>>(config: AllowedMWS<R, T, C>): C;
export declare class MultiWaySwitch<R, T, C extends MultWaySwitchConfig<R, T> = MultWaySwitchConfig<R, T>> extends Stage<R, C> {
    constructor(config?: AllowedMWS<R, T, C>);
    get reportName(): string;
    toString(): string;
    protected combine(ctx: unknown, retCtx: unknown): unknown;
    protected combineCase(item: MultiWaySwitchCase<R, T>, ctx: unknown, retCtx: unknown): unknown;
    protected split(ctx: unknown): unknown;
    protected splitCase(item: unknown, ctx: unknown): any;
    compile(rebuild?: boolean): StageRun<R>;
}
//# sourceMappingURL=multiwayswitch.d.ts.map