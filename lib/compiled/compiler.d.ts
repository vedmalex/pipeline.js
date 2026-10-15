import { StageObject } from '../utils/types';
import { CompiledPlan } from './plan';
type PipelineLike<T extends StageObject> = {
    config: {
        stages: Array<unknown>;
    };
    toString(): string;
    reportName?: string;
    _graphVersion?: number;
    getCompiledPlan?: (rebuild: boolean) => CompiledPlan<T>;
};
export declare function compilePipelinePlan<T extends StageObject>(pipeline: PipelineLike<T>): CompiledPlan<T>;
export declare function getPipelineDependencySignature<T extends StageObject>(pipeline: PipelineLike<T>): string;
export {};
//# sourceMappingURL=compiler.d.ts.map