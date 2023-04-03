import z from 'zod';
export declare const StageConfigSchema: z.ZodObject<{
    run: z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>;
    name: z.ZodOptional<z.ZodString>;
    rescue: z.ZodOptional<z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>>;
    schema: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
    ensure: z.ZodOptional<z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>>;
    validate: z.ZodOptional<z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>>;
    compile: z.ZodOptional<z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    run: (...args: unknown[]) => unknown;
    name?: string | undefined;
    rescue?: ((...args: unknown[]) => unknown) | undefined;
    schema?: {} | undefined;
    ensure?: ((...args: unknown[]) => unknown) | undefined;
    validate?: ((...args: unknown[]) => unknown) | undefined;
    compile?: ((...args: unknown[]) => unknown) | undefined;
}, {
    run: (...args: unknown[]) => unknown;
    name?: string | undefined;
    rescue?: ((...args: unknown[]) => unknown) | undefined;
    schema?: {} | undefined;
    ensure?: ((...args: unknown[]) => unknown) | undefined;
    validate?: ((...args: unknown[]) => unknown) | undefined;
    compile?: ((...args: unknown[]) => unknown) | undefined;
}>;
//# sourceMappingURL=base.d.ts.map