export type StageRun<Input, Output> = (
  context: Input,
) => Promise<Output>
