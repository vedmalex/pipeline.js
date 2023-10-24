import { AbstractStage, BaseStageConfig } from './base';
export declare class Empty<Input, TConfig extends BaseStageConfig<Input, Input> = BaseStageConfig<Input, Input>> extends AbstractStage<Input, Input, TConfig> {
    constructor(config: TConfig);
}
export declare function empty(config?: BaseStageConfig<any, any>): EmptyBuilder;
export interface EmptyBuilder {
    config: BaseStageConfig<any, any>;
    build(): Empty<any, BaseStageConfig<any, any>>;
}
