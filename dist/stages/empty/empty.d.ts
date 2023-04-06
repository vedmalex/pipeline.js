import { AllowedStage, Stage, StageConfig, StageObject } from '../../stage';
export declare class Empty<R extends StageObject, C extends StageConfig<R> = StageConfig<R>> extends Stage<R, C> {
    constructor(config: AllowedStage<R, C>);
    toString(): string;
}
//# sourceMappingURL=Empty.d.ts.map