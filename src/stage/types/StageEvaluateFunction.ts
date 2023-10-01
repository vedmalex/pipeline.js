import { MaybePromise } from 'src/builder/StageBuilderWithZod'

export type StageEvaluateFunction<Input> = (ctx: Input) => MaybePromise<boolean>
