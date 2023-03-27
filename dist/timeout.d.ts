import { Stage } from './stage';
import { AllowedStage } from './utils/types/types';
import { StageRun, TimeoutConfig } from './utils/types/types';
export declare class Timeout<R, C extends TimeoutConfig<R> = TimeoutConfig<R>> extends Stage<R, C> {
    constructor(config?: AllowedStage<R, C>);
    get reportName(): string;
    toString(): string;
    compile(rebuild?: boolean): StageRun<R>;
}
//# sourceMappingURL=timeout.d.ts.map