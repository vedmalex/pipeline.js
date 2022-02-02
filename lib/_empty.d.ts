import { Stage } from './stage';
import { AllowedStage, StageConfig } from './utils/types';
export declare class Empty<T, R = T> extends Stage<T, StageConfig<T, R>, R> {
    constructor(config: AllowedStage<T, StageConfig<T, R>, R>);
    toString(): string;
}
//# sourceMappingURL=_empty.d.ts.map