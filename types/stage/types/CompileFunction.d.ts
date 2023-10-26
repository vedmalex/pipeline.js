import { AnyStage } from './AnyStage';
import { StageRun } from './StageRun';
export type CompileFunction<Input, Output> = (this: AnyStage<Input, Output>, rebuild?: boolean) => StageRun<Input, Output>;
export declare function isCompileFunction<Input, Output>(inp?: unknown): inp is CompileFunction<Input, Output>;
