import { Stage } from './stage';
import { AllowedStage, StageConfig, StageObject } from './utils/types';
export declare class Empty<T extends StageObject, R extends StageObject = T> extends Stage<T, StageConfig<T, R>, R> {
    constructor(config: AllowedStage<T, StageConfig<T, R>, R>);
    toString(): string;
}
//# sourceMappingURL=empty.d.ts.map