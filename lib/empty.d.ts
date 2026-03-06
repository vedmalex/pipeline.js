import { Stage } from './stage';
import { AllowedStage, StageConfig, StageObject } from './utils/types';
export declare class Empty<T extends StageObject> extends Stage<T, StageConfig<T>> {
    constructor(config: AllowedStage<T, T, StageConfig<T>>);
    toString(): string;
}
//# sourceMappingURL=empty.d.ts.map