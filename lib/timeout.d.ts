import { Stage } from './stage';
import { AllowedStage, StageObject } from './utils/types';
import { StageRun, TimeoutConfig } from './utils/types';
export declare class Timeout<T extends StageObject> extends Stage<T, TimeoutConfig<T>> {
    constructor(config?: AllowedStage<T, TimeoutConfig<T>>);
    get reportName(): string;
    toString(): string;
    compile(rebuild?: boolean): StageRun<T>;
}
//# sourceMappingURL=timeout.d.ts.map