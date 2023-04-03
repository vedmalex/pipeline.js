export type AsyncStageRun<R> = (err: unknown, context: unknown) => Promise<R>
