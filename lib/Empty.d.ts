import { Stage } from './stage';
import { StageConfig, AllowedStage } from './utils/types';
export declare class Empty<T = any, C extends StageConfig<T, R> = any, R = T> extends Stage<T, C, R> {
    constructor(config: AllowedStage<T, C, R>);
    toString(): string;
}
//# sourceMappingURL=empty.d.ts.map