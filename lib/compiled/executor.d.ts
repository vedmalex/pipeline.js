import { type CleanError } from '../utils/ErrorList';
import { CallbackFunction, Possible, RunPipelineFunction, StageObject } from '../utils/types';
import { CompiledPlan } from './plan';
export type ExecutableMultiWaySwitchStaticCase = {
    stage: unknown;
    split?: (ctx: any) => any;
    combine?: (ctx: any, retCtx: any) => any;
    run: RunPipelineFunction<any>;
};
export type ExecutableMultiWaySwitchDynamicCase = ExecutableMultiWaySwitchStaticCase & {
    evaluate: (ctx: any) => any;
};
export type ExecutableMultiWaySwitchData = {
    statics: ExecutableMultiWaySwitchStaticCase[];
    dynamics: ExecutableMultiWaySwitchDynamicCase[];
};
export declare function invokeStageFn<T extends StageObject>(plan: CompiledPlan<T>, stageFnId: number, inputErr: Possible<Error>, context: T, done: CallbackFunction<T>, signal?: AbortSignal): void;
export declare function executeFusedStageFnSequence<T extends StageObject>(plan: CompiledPlan<T>, stageFnIds: number[], inputErr: Possible<CleanError>, initialCtx: T, done: CallbackFunction<T>): void;
export declare function executeNativeMultiWaySwitch<T extends StageObject>(initialErr: Possible<CleanError>, initialCtx: T, data: ExecutableMultiWaySwitchData, done: CallbackFunction<T>): void;
export declare function executeInlineControlFlowSubplan<T extends StageObject>(plan: CompiledPlan<T>, inputErr: Possible<CleanError>, initialCtx: T, done: CallbackFunction<T>): void;
export declare function executeCompiledPlan<T extends StageObject>(plan: CompiledPlan<T>, err: Possible<Error>, context: T, done: CallbackFunction<T>): void;
//# sourceMappingURL=executor.d.ts.map