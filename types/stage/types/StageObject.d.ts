import z from 'zod';
export declare const StageObjectSchema: z.ZodObject<{}, "passthrough", z.ZodTypeAny, z.objectOutputType<{}, z.ZodTypeAny, "passthrough">, z.objectInputType<{}, z.ZodTypeAny, "passthrough">>;
export declare const ExtendStageObjectWith: <T extends z.ZodRawShape>(schema: z.ZodObject<T, z.UnknownKeysParam, z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<T>, { [k_1 in keyof z.baseObjectOutputType<T>]: undefined extends z.baseObjectOutputType<T>[k_1] ? never : k_1; }[keyof T]> extends infer T_1 ? { [k in keyof T_1]: z.objectUtil.addQuestionMarks<z.baseObjectOutputType<T>, { [k_1 in keyof z.baseObjectOutputType<T>]: undefined extends z.baseObjectOutputType<T>[k_1] ? never : k_1; }[keyof T]>[k]; } : never, z.baseObjectInputType<T> extends infer T_2 ? { [k_2 in keyof T_2]: z.baseObjectInputType<T>[k_2]; } : never>) => z.ZodObject<{ [k_3 in keyof (Omit<{}, keyof T> & T)]: (Omit<{}, keyof T> & T)[k_3]; }, z.UnknownKeysParam, z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<{ [k_3 in keyof (Omit<{}, keyof T> & T)]: (Omit<{}, keyof T> & T)[k_3]; }>, { [k_5 in keyof z.baseObjectOutputType<{ [k_3 in keyof (Omit<{}, keyof T> & T)]: (Omit<{}, keyof T> & T)[k_3]; }>]: undefined extends z.baseObjectOutputType<{ [k_3 in keyof (Omit<{}, keyof T> & T)]: (Omit<{}, keyof T> & T)[k_3]; }>[k_5] ? never : k_5; }[keyof T]> extends infer T_3 ? { [k_4 in keyof T_3]: z.objectUtil.addQuestionMarks<z.baseObjectOutputType<{ [k_3 in keyof (Omit<{}, keyof T> & T)]: (Omit<{}, keyof T> & T)[k_3]; }>, { [k_5 in keyof z.baseObjectOutputType<{ [k_3 in keyof (Omit<{}, keyof T> & T)]: (Omit<{}, keyof T> & T)[k_3]; }>]: undefined extends z.baseObjectOutputType<{ [k_3 in keyof (Omit<{}, keyof T> & T)]: (Omit<{}, keyof T> & T)[k_3]; }>[k_5] ? never : k_5; }[keyof T]>[k_4]; } : never, z.baseObjectInputType<{ [k_3 in keyof (Omit<{}, keyof T> & T)]: (Omit<{}, keyof T> & T)[k_3]; }> extends infer T_4 ? { [k_6 in keyof T_4]: z.baseObjectInputType<{ [k_3 in keyof (Omit<{}, keyof T> & T)]: (Omit<{}, keyof T> & T)[k_3]; }>[k_6]; } : never>;
export type StageObject<Output = object> = Output extends object ? Output : never;