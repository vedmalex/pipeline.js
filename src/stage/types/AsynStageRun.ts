export type AsyncStageRun<Input, Output> = (err: unknown, context: unknown) => Promise<Output>
