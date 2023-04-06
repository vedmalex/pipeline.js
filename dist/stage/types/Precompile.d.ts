import { AnyStage } from './AnyStage';
import { StageObject } from './StageObject';
export type Precompile<R extends StageObject> = (this: AnyStage<R>) => void;
export declare function isPrecompile<R extends StageObject>(inp?: unknown): inp is Precompile<R>;
//# sourceMappingURL=Precompile.d.ts.map