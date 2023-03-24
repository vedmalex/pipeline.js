import { Stage } from './stage';
import { SplitFunction } from './utils/types/types';
import { AllowedStage, RunPipelineFunction, CombineFunction, EvaluateFunction } from './utils/types/types';
import { StageConfig, StageRun, AnyStage } from './utils/types/types';
export type MultiWaySwitchCase<R> = MultiWaySwitchStatic<R> | MultiWaySwitchDynamic<R>;
export interface MultiWaySwitchStatic<R> {
    stage: AnyStage | RunPipelineFunction<R>;
    evaluate?: boolean;
    split?: SplitFunction<R>;
    combine?: CombineFunction<R>;
}
export interface MultiWaySwitchDynamic<R> {
    stage: AnyStage | RunPipelineFunction<R>;
    evaluate: EvaluateFunction<R>;
    split?: SplitFunction<R>;
    combine?: CombineFunction<R>;
}
export declare function isMultiWaySwitch<R>(inp: object): inp is MultiWaySwitchCase<R>;
export interface MultWaySwitchConfig<R> extends StageConfig<R> {
    cases: Array<MultiWaySwitchCase<R>>;
    split?: SplitFunction<R>;
    combine?: CombineFunction<R>;
}
export type AllowedMWS<R, C extends StageConfig<R>> = AllowedStage<R, C> | Array<AnyStage | RunPipelineFunction<R> | MultiWaySwitchCase<R>>;
export declare function getMultWaySwitchConfig<R, C extends MultWaySwitchConfig<R>>(config: AllowedMWS<R, C>): C;
export declare class MultiWaySwitch<R, C extends MultWaySwitchConfig<R>> extends Stage<R, C> {
    constructor(config?: AllowedStage<R, C>);
    get reportName(): string;
    toString(): string;
    protected combine(ctx: unknown, retCtx: Array<unknown>): unknown;
    protected combineCase(item: MultiWaySwitchCase<R>, ctx: unknown, retCtx: Array<unknown>): unknown;
    split(ctx: unknown): unknown;
    splitCase(item: unknown, ctx: unknown): any;
    compile(rebuild?: boolean): StageRun<R>;
}
//# sourceMappingURL=multiwayswitch.d.ts.map