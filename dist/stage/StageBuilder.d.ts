import { JSONSchemaType } from 'ajv';
import { StageConfig } from './StageConfig';
import { CompileFunction, EnsureFunction, Precompile, Rescue, RunPipelineFunction, StageObject, ValidateFunction } from './types';
export declare class StageBuilder<R extends StageObject, C extends StageConfig<R>> {
    private cfg;
    constructor();
    run(fn: RunPipelineFunction<R>): void;
    name(name: string): this;
    rescue(fn: Rescue): this;
    schema(obj: JSONSchemaType<R>): this;
    ensure(fn: EnsureFunction<R>): this;
    validate(fn: ValidateFunction<R>): this;
    compile(fn: CompileFunction<R>): this;
    precompile(fn: Precompile<R>): this;
    isValid(): void;
    get config(): C;
}
//# sourceMappingURL=StageBuilder.d.ts.map