import { AllowedStageStored, Config } from '../../stage';
export interface ParallelConfig<Input, Output, T> extends Config<Input, Output> {
    stage: AllowedStageStored<Input, Output, Config<Input, Output>>;
    split?: (ctx: Input) => Array<T>;
    combine?: (ctx: Input, children: Array<T>) => Output;
}
