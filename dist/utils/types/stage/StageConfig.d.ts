import { JSONSchemaType } from 'ajv';
import { CompileFunction } from '../CompileFunction';
import { Precompile } from '../Precompile';
import { ValidateFunction } from '../ValidateFunction';
import { Rescue } from '../Rescue';
import { EnsureFunction } from '../EnsureFunction';
import * as z from 'zod';
import { RunPipelineFunction } from './RunPipelineFunction';
export declare const StageConfig: z.ZodEffects<z.ZodObject<{
    run: z.ZodOptional<z.ZodUnion<[z.ZodFunction<z.ZodTuple<[z.ZodUndefined], z.ZodUnknown>, z.ZodUndefined>, z.ZodFunction<z.ZodTuple<[z.ZodUndefined], z.ZodUnknown>, z.ZodAny>, z.ZodFunction<z.ZodTuple<[z.ZodUndefined], z.ZodUnknown>, z.ZodPromise<z.ZodAny>>, z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodPromise<z.ZodAny>>, z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodAny>, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodAny], z.ZodUnknown>, z.ZodUndefined>], z.ZodUnknown>, z.ZodUnknown>, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodAny], z.ZodUnknown>, z.ZodPromise<z.ZodAny>>, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodAny, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodAny], z.ZodUnknown>, z.ZodUndefined>], z.ZodUnknown>, z.ZodUnknown>]>>;
    name: z.ZodOptional<z.ZodString>;
    rescue: z.ZodOptional<z.ZodUnion<[z.ZodFunction<z.ZodTuple<[z.ZodUnknown], z.ZodUnknown>, z.ZodAny>, z.ZodFunction<z.ZodTuple<[z.ZodUnknown], z.ZodUnknown>, z.ZodPromise<z.ZodVoid>>, z.ZodFunction<z.ZodTuple<[z.ZodUnknown, z.ZodUnknown], z.ZodUnknown>, z.ZodPromise<z.ZodVoid>>, z.ZodFunction<z.ZodTuple<[z.ZodUnknown, z.ZodUnknown], z.ZodUnknown>, z.ZodUnknown>, z.ZodFunction<z.ZodTuple<[z.ZodUnknown, z.ZodUnknown, z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>], z.ZodUnknown>, z.ZodVoid>]>>;
    schema: z.ZodOptional<z.ZodObject<{}, "passthrough", z.ZodTypeAny, z.objectOutputType<{}, z.ZodTypeAny, "passthrough">, z.objectInputType<{}, z.ZodTypeAny, "passthrough">>>;
    ensure: z.ZodOptional<z.ZodUnion<[z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodAny>, z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodPromise<z.ZodAny>>, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodEffects<z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodAny], z.ZodUnknown>, z.ZodVoid>, (args_0: any, args_1: any, ...args_2: unknown[]) => void, (args_0: any, args_1: any, ...args_2: unknown[]) => void>], z.ZodUnknown>, z.ZodUndefined>]>>;
    validate: z.ZodOptional<z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>>;
    compile: z.ZodOptional<z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>>;
    precompile: z.ZodOptional<z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    run: z.ZodOptional<z.ZodUnion<[z.ZodFunction<z.ZodTuple<[z.ZodUndefined], z.ZodUnknown>, z.ZodUndefined>, z.ZodFunction<z.ZodTuple<[z.ZodUndefined], z.ZodUnknown>, z.ZodAny>, z.ZodFunction<z.ZodTuple<[z.ZodUndefined], z.ZodUnknown>, z.ZodPromise<z.ZodAny>>, z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodPromise<z.ZodAny>>, z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodAny>, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodAny], z.ZodUnknown>, z.ZodUndefined>], z.ZodUnknown>, z.ZodUnknown>, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodAny], z.ZodUnknown>, z.ZodPromise<z.ZodAny>>, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodAny, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodAny], z.ZodUnknown>, z.ZodUndefined>], z.ZodUnknown>, z.ZodUnknown>]>>;
    name: z.ZodOptional<z.ZodString>;
    rescue: z.ZodOptional<z.ZodUnion<[z.ZodFunction<z.ZodTuple<[z.ZodUnknown], z.ZodUnknown>, z.ZodAny>, z.ZodFunction<z.ZodTuple<[z.ZodUnknown], z.ZodUnknown>, z.ZodPromise<z.ZodVoid>>, z.ZodFunction<z.ZodTuple<[z.ZodUnknown, z.ZodUnknown], z.ZodUnknown>, z.ZodPromise<z.ZodVoid>>, z.ZodFunction<z.ZodTuple<[z.ZodUnknown, z.ZodUnknown], z.ZodUnknown>, z.ZodUnknown>, z.ZodFunction<z.ZodTuple<[z.ZodUnknown, z.ZodUnknown, z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>], z.ZodUnknown>, z.ZodVoid>]>>;
    schema: z.ZodOptional<z.ZodObject<{}, "passthrough", z.ZodTypeAny, z.objectOutputType<{}, z.ZodTypeAny, "passthrough">, z.objectInputType<{}, z.ZodTypeAny, "passthrough">>>;
    ensure: z.ZodOptional<z.ZodUnion<[z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodAny>, z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodPromise<z.ZodAny>>, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodEffects<z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodAny], z.ZodUnknown>, z.ZodVoid>, (args_0: any, args_1: any, ...args_2: unknown[]) => void, (args_0: any, args_1: any, ...args_2: unknown[]) => void>], z.ZodUnknown>, z.ZodUndefined>]>>;
    validate: z.ZodOptional<z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>>;
    compile: z.ZodOptional<z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>>;
    precompile: z.ZodOptional<z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    run: z.ZodOptional<z.ZodUnion<[z.ZodFunction<z.ZodTuple<[z.ZodUndefined], z.ZodUnknown>, z.ZodUndefined>, z.ZodFunction<z.ZodTuple<[z.ZodUndefined], z.ZodUnknown>, z.ZodAny>, z.ZodFunction<z.ZodTuple<[z.ZodUndefined], z.ZodUnknown>, z.ZodPromise<z.ZodAny>>, z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodPromise<z.ZodAny>>, z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodAny>, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodAny], z.ZodUnknown>, z.ZodUndefined>], z.ZodUnknown>, z.ZodUnknown>, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodAny], z.ZodUnknown>, z.ZodPromise<z.ZodAny>>, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodAny, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodAny], z.ZodUnknown>, z.ZodUndefined>], z.ZodUnknown>, z.ZodUnknown>]>>;
    name: z.ZodOptional<z.ZodString>;
    rescue: z.ZodOptional<z.ZodUnion<[z.ZodFunction<z.ZodTuple<[z.ZodUnknown], z.ZodUnknown>, z.ZodAny>, z.ZodFunction<z.ZodTuple<[z.ZodUnknown], z.ZodUnknown>, z.ZodPromise<z.ZodVoid>>, z.ZodFunction<z.ZodTuple<[z.ZodUnknown, z.ZodUnknown], z.ZodUnknown>, z.ZodPromise<z.ZodVoid>>, z.ZodFunction<z.ZodTuple<[z.ZodUnknown, z.ZodUnknown], z.ZodUnknown>, z.ZodUnknown>, z.ZodFunction<z.ZodTuple<[z.ZodUnknown, z.ZodUnknown, z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>], z.ZodUnknown>, z.ZodVoid>]>>;
    schema: z.ZodOptional<z.ZodObject<{}, "passthrough", z.ZodTypeAny, z.objectOutputType<{}, z.ZodTypeAny, "passthrough">, z.objectInputType<{}, z.ZodTypeAny, "passthrough">>>;
    ensure: z.ZodOptional<z.ZodUnion<[z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodAny>, z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodPromise<z.ZodAny>>, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodEffects<z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodAny], z.ZodUnknown>, z.ZodVoid>, (args_0: any, args_1: any, ...args_2: unknown[]) => void, (args_0: any, args_1: any, ...args_2: unknown[]) => void>], z.ZodUnknown>, z.ZodUndefined>]>>;
    validate: z.ZodOptional<z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>>;
    compile: z.ZodOptional<z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>>;
    precompile: z.ZodOptional<z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>>;
}, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
    run: z.ZodOptional<z.ZodUnion<[z.ZodFunction<z.ZodTuple<[z.ZodUndefined], z.ZodUnknown>, z.ZodUndefined>, z.ZodFunction<z.ZodTuple<[z.ZodUndefined], z.ZodUnknown>, z.ZodAny>, z.ZodFunction<z.ZodTuple<[z.ZodUndefined], z.ZodUnknown>, z.ZodPromise<z.ZodAny>>, z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodPromise<z.ZodAny>>, z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodAny>, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodAny], z.ZodUnknown>, z.ZodUndefined>], z.ZodUnknown>, z.ZodUnknown>, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodAny], z.ZodUnknown>, z.ZodPromise<z.ZodAny>>, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodAny, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodAny], z.ZodUnknown>, z.ZodUndefined>], z.ZodUnknown>, z.ZodUnknown>]>>;
    name: z.ZodOptional<z.ZodString>;
    rescue: z.ZodOptional<z.ZodUnion<[z.ZodFunction<z.ZodTuple<[z.ZodUnknown], z.ZodUnknown>, z.ZodAny>, z.ZodFunction<z.ZodTuple<[z.ZodUnknown], z.ZodUnknown>, z.ZodPromise<z.ZodVoid>>, z.ZodFunction<z.ZodTuple<[z.ZodUnknown, z.ZodUnknown], z.ZodUnknown>, z.ZodPromise<z.ZodVoid>>, z.ZodFunction<z.ZodTuple<[z.ZodUnknown, z.ZodUnknown], z.ZodUnknown>, z.ZodUnknown>, z.ZodFunction<z.ZodTuple<[z.ZodUnknown, z.ZodUnknown, z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>], z.ZodUnknown>, z.ZodVoid>]>>;
    schema: z.ZodOptional<z.ZodObject<{}, "passthrough", z.ZodTypeAny, z.objectOutputType<{}, z.ZodTypeAny, "passthrough">, z.objectInputType<{}, z.ZodTypeAny, "passthrough">>>;
    ensure: z.ZodOptional<z.ZodUnion<[z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodAny>, z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodPromise<z.ZodAny>>, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodEffects<z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodAny], z.ZodUnknown>, z.ZodVoid>, (args_0: any, args_1: any, ...args_2: unknown[]) => void, (args_0: any, args_1: any, ...args_2: unknown[]) => void>], z.ZodUnknown>, z.ZodUndefined>]>>;
    validate: z.ZodOptional<z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>>;
    compile: z.ZodOptional<z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>>;
    precompile: z.ZodOptional<z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    run: z.ZodOptional<z.ZodUnion<[z.ZodFunction<z.ZodTuple<[z.ZodUndefined], z.ZodUnknown>, z.ZodUndefined>, z.ZodFunction<z.ZodTuple<[z.ZodUndefined], z.ZodUnknown>, z.ZodAny>, z.ZodFunction<z.ZodTuple<[z.ZodUndefined], z.ZodUnknown>, z.ZodPromise<z.ZodAny>>, z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodPromise<z.ZodAny>>, z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodAny>, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodAny], z.ZodUnknown>, z.ZodUndefined>], z.ZodUnknown>, z.ZodUnknown>, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodAny], z.ZodUnknown>, z.ZodPromise<z.ZodAny>>, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodAny, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodAny], z.ZodUnknown>, z.ZodUndefined>], z.ZodUnknown>, z.ZodUnknown>]>>;
    name: z.ZodOptional<z.ZodString>;
    rescue: z.ZodOptional<z.ZodUnion<[z.ZodFunction<z.ZodTuple<[z.ZodUnknown], z.ZodUnknown>, z.ZodAny>, z.ZodFunction<z.ZodTuple<[z.ZodUnknown], z.ZodUnknown>, z.ZodPromise<z.ZodVoid>>, z.ZodFunction<z.ZodTuple<[z.ZodUnknown, z.ZodUnknown], z.ZodUnknown>, z.ZodPromise<z.ZodVoid>>, z.ZodFunction<z.ZodTuple<[z.ZodUnknown, z.ZodUnknown], z.ZodUnknown>, z.ZodUnknown>, z.ZodFunction<z.ZodTuple<[z.ZodUnknown, z.ZodUnknown, z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>], z.ZodUnknown>, z.ZodVoid>]>>;
    schema: z.ZodOptional<z.ZodObject<{}, "passthrough", z.ZodTypeAny, z.objectOutputType<{}, z.ZodTypeAny, "passthrough">, z.objectInputType<{}, z.ZodTypeAny, "passthrough">>>;
    ensure: z.ZodOptional<z.ZodUnion<[z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodAny>, z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodPromise<z.ZodAny>>, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodEffects<z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodAny], z.ZodUnknown>, z.ZodVoid>, (args_0: any, args_1: any, ...args_2: unknown[]) => void, (args_0: any, args_1: any, ...args_2: unknown[]) => void>], z.ZodUnknown>, z.ZodUndefined>]>>;
    validate: z.ZodOptional<z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>>;
    compile: z.ZodOptional<z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>>;
    precompile: z.ZodOptional<z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>>;
}, z.ZodTypeAny, "passthrough">>;
export declare function isStageConfig<R>(obj: unknown): obj is StageConfig<R>;
export interface StageConfig<R> {
    run?: RunPipelineFunction<R>;
    name?: string;
    rescue?: Rescue<R>;
    schema?: JSONSchemaType<R>;
    ensure?: EnsureFunction<R>;
    validate?: ValidateFunction<R>;
    compile?: CompileFunction<R>;
    precompile?: Precompile<R>;
}
//# sourceMappingURL=StageConfig.d.ts.map