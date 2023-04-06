import { JSONSchemaType } from 'ajv';
import { CompileFunction, EnsureFunction, Precompile, Rescue, RunPipelineFunction, StageObject, ValidateFunction } from './types';
export interface StageConfig<R extends StageObject> {
    run?: RunPipelineFunction<R>;
    name?: string;
    rescue?: Rescue;
    schema?: JSONSchemaType<R>;
    ensure?: EnsureFunction<R>;
    validate?: ValidateFunction<R>;
    compile?: CompileFunction<R>;
    precompile?: Precompile<R>;
}
//# sourceMappingURL=StageConfig.d.ts.map