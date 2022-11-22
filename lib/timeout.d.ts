import { Stage } from './stage';
import { AllowedStage, StageObject } from './utils/types';
import { StageRun, TimeoutConfig } from './utils/types';
export declare class Timeout<T extends StageObject, R extends StageObject = T> extends Stage<T, TimeoutConfig<T, R>, R> {
    constructor(config?: AllowedStage<T, TimeoutConfig<T, R>, R>);
    get reportName(): string;
    toString(): string;
    compile(rebuild?: boolean): StageRun<T, R>;
}
//# sourceMappingURL=timeout.d.ts.map