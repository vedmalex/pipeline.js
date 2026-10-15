import { Stage } from './stage';
import { CompiledPlan } from './compiled/plan';
import { type ContextExecutionMode } from './context_mode';
import { AnyStage, StageObject } from './utils/types';
import { AllowedStage, PipelineConfig, RunPipelineFunction, StageConfig, StageRun } from './utils/types';
export declare function __setCompiledPipelineEnabledForTests(enabled?: boolean): void;
export declare function __isCompiledPipelineEnabled(): boolean;
export declare function __getContextModeForTests(): ContextExecutionMode;
export declare class Pipeline<T extends StageObject> extends Stage<T, PipelineConfig<T>> {
    protected _graphVersion: number;
    protected compiledPlan?: CompiledPlan<T>;
    protected compiledPlanVersion?: number;
    protected compiledDependencySignature?: string;
    protected _compiledParents: Set<Pipeline<any>>;
    static setContextMode(mode: ContextExecutionMode): void;
    static getContextMode(): ContextExecutionMode;
    constructor(config?: PipelineConfig<T> | AllowedStage<T, T, PipelineConfig<T>> | Array<Stage<T, PipelineConfig<T>> | RunPipelineFunction<T>>);
    get reportName(): string;
    protected isPipelineStage(stage: unknown): stage is Pipeline<any>;
    protected registerImmediatePipelineChildren(): void;
    protected registerCompiledParent(parent: Pipeline<any>): void;
    protected invalidateCompiledCache(visited?: Set<Pipeline<any>>): void;
    addStage<IT extends StageObject>(_stage: StageConfig<IT> | RunPipelineFunction<IT> | AnyStage<IT>): void;
    toString(): string;
    protected getCompiledPlan(rebuild?: boolean): CompiledPlan<T>;
    protected shouldUseCompiledPlan(plan: CompiledPlan<T>): boolean;
    compile(rebuild?: boolean): StageRun<T>;
}
//# sourceMappingURL=pipeline.d.ts.map