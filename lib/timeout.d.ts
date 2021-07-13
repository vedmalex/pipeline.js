import { Stage } from './stage';
import { AllowedStage } from './utils/types';
import { StageRun, TimeoutConfig } from './utils/types';
export declare class Timeout<T = any, C extends TimeoutConfig<T, R> = any, R = T> extends Stage<T, C, R> {
    constructor(config?: AllowedStage<T, C, R>);
    get reportName(): string;
    toString(): string;
    compile(rebuild?: boolean): StageRun<T, R>;
}
//# sourceMappingURL=timeout.d.ts.map