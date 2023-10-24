import { AbstractStage, BaseStageConfig } from './base';
export declare class Empty<Input, TConfig extends BaseStageConfig<Input, Input> = BaseStageConfig<Input, Input>> extends AbstractStage<Input, Input, TConfig> {
    constructor(config: TConfig);
}
export declare function empty(_def?: BaseStageConfig<any, any>): EmptyBuilder;
export interface EmptyBuilder {
    _def: BaseStageConfig<any, any>;
    build(): Empty<any, BaseStageConfig<any, any>>;
}
