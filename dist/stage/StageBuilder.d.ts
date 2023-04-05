import { JSONSchemaType } from 'ajv';
import * as z from 'zod';
import { StageConfig } from './StageConfig';
import { CompileFunction, EnsureFunction, Precompile, Rescue, RunPipelineFunction, ValidateFunction } from './types';
export declare class StageBuilder<R, C extends StageConfig<R>> {
    private cfg;
    constructor();
    run(fn: RunPipelineFunction<R>): void;
    name(name: string): this;
    rescue(fn: Rescue<R>): this;
    schema(obj: JSONSchemaType<R>): this;
    ensure(fn: EnsureFunction<R>): this;
    validate(fn: ValidateFunction<R>): this;
    compile(fn: CompileFunction<R>): this;
    precompile(fn: Precompile<R>): this;
    isValid(): void;
    get config(): z.objectOutputType<{
        run: z.ZodOptional<z.ZodUnion<[z.ZodFunction<z.ZodTuple<[z.ZodUndefined], z.ZodUnknown>, z.ZodUndefined>, z.ZodFunction<z.ZodTuple<[z.ZodUndefined], z.ZodUnknown>, z.ZodAny>, z.ZodFunction<z.ZodTuple<[z.ZodUndefined], z.ZodUnknown>, z.ZodPromise<z.ZodAny>>, z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodPromise<z.ZodAny>>, z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodAny>, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodAny], z.ZodUnknown>, z.ZodUndefined>], z.ZodUnknown>, z.ZodUnknown>, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodAny], z.ZodUnknown>, z.ZodPromise<z.ZodAny>>, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodAny, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodAny], z.ZodUnknown>, z.ZodUndefined>], z.ZodUnknown>, z.ZodUnknown>]>>;
        name: z.ZodOptional<z.ZodString>;
        rescue: z.ZodOptional<z.ZodUnion<[z.ZodFunction<z.ZodTuple<[z.ZodUnknown], z.ZodUnknown>, z.ZodAny>, z.ZodFunction<z.ZodTuple<[z.ZodUnknown], z.ZodUnknown>, z.ZodPromise<z.ZodVoid>>, z.ZodFunction<z.ZodTuple<[z.ZodUnknown, z.ZodUnknown], z.ZodUnknown>, z.ZodPromise<z.ZodVoid>>, z.ZodFunction<z.ZodTuple<[z.ZodUnknown, z.ZodUnknown], z.ZodUnknown>, z.ZodUnknown>, z.ZodFunction<z.ZodTuple<[z.ZodUnknown, z.ZodUnknown, z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>], z.ZodUnknown>, z.ZodVoid>]>>;
        schema: z.ZodOptional<z.ZodObject<{}, "passthrough", z.ZodTypeAny, z.objectOutputType<{}, z.ZodTypeAny, "passthrough">, z.objectInputType<{}, z.ZodTypeAny, "passthrough">>>;
        ensure: z.ZodOptional<z.ZodUnion<[z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodAny>, z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodPromise<z.ZodAny>>, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodFunction<z.ZodTuple<[z.ZodOptional<z.ZodAny>, z.ZodOptional<z.ZodAny>], z.ZodUnknown>, z.ZodVoid>], z.ZodUnknown>, z.ZodUndefined>]>>;
        validate: z.ZodOptional<z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>>;
        compile: z.ZodOptional<z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>>;
        precompile: z.ZodOptional<z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">;
}
//# sourceMappingURL=StageBuilder.d.ts.map