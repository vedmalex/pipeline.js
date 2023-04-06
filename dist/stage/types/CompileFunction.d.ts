import { StageRun } from './StageRun';
import { StageObject } from './StageObject';
export type CompileFunction<R extends StageObject> = (rebuild?: boolean) => StageRun<R>;
export declare function isCompileFunction<R extends StageObject>(inp?: unknown): inp is CompileFunction<R>;
//# sourceMappingURL=CompileFunction.d.ts.map