import { Stage } from './stage';
import { AllowedStage } from './utils/types';
import { StageRun, TimeoutConfig } from './utils/types';
export declare class Timeout<T, R = T> extends Stage<T, TimeoutConfig<T, R>, R> {
    constructor(config?: AllowedStage<T, TimeoutConfig<T, R>, R>);
    get reportName(): string;
    toString(): string;
    compile(rebuild?: boolean): StageRun<T, R>;
}
//# sourceMappingURL=timeout.d.ts.map