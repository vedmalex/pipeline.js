import { AllowedStage, Stage, StageObject, StageRun } from '../../stage';
import { TimeoutConfig } from './TimeoutConfig';
export declare class Timeout<R extends StageObject, C extends TimeoutConfig<R> = TimeoutConfig<R>> extends Stage<R, C> {
    constructor(config?: AllowedStage<R, C>);
    get reportName(): string;
    toString(): string;
    compile(rebuild?: boolean): StageRun<R>;
}
//# sourceMappingURL=timeout.d.ts.map