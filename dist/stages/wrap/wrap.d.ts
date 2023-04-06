import { AllowedStage, ContextType, Stage, StageObject, StageRun } from '../../stage';
import { WrapConfig } from './WrapConfig';
export declare class Wrap<R extends StageObject, T extends StageObject, C extends WrapConfig<R, T> = WrapConfig<R, T>> extends Stage<R, C> {
    constructor(config?: AllowedStage<R, C>);
    get reportName(): string;
    toString(): string;
    compile(rebuild?: boolean): StageRun<R>;
    protected prepare(ctx: ContextType<R>): ContextType<T>;
    protected finalize(ctx: ContextType<R>, retCtx: ContextType<T>): ContextType<R> | void;
}
//# sourceMappingURL=wrap.d.ts.map