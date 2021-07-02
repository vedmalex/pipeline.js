import { Stage } from './stage';
import { AllowedStage } from './utils/types';
import { StageRun, TimeoutConfig } from './utils/types';
export declare class Timeout<T, C extends TimeoutConfig<T, R>, R> extends Stage<T, C, R> {
    constructor(config?: AllowedStage<T, C, R>);
    get reportName(): string;
    toString(): string;
    compile(rebuild?: boolean): StageRun<T, R>;
}
//# sourceMappingURL=timeout.d.ts.map