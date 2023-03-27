import { Stage } from './stage';
import { AllowedStage, StageConfig } from './utils/types/types';
export declare class Empty<R, C extends StageConfig<R> = StageConfig<R>> extends Stage<R, C> {
    constructor(config: AllowedStage<R, C>);
    toString(): string;
}
//# sourceMappingURL=empty.d.ts.map