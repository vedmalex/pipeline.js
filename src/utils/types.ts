import { JSONSchemaType } from 'ajv'

export interface IStage<T = any, C extends StageConfig<T, R> = any, R = T> {
  get name(): string
  get reportName(): string
  toString(): string
  execute(context: T): Promise<R | T>
  execute(context: T, callback: CallbackFunction<R | T>): void
  execute(
    err: Error | undefined,
    context: T,
    callback: CallbackFunction<R | T>,
  ): void
  compile(rebuild?: boolean): void
  get config(): C
}

export function isIStage<T, C, R>(inp: any): inp is IStage<T, C, R> {
  if (inp) {
    return (
      typeof inp.compile == 'function' &&
      typeof inp.execute == 'function' &&
      typeof inp.config == 'object'
    )
  } else return false
}
export type Func0Sync<R> = () => R
export type Func1Sync<R, P1> = (p1: P1) => R
export type Func2Sync<R, P1, P2> = (p1: P1, p2: P2) => R
export type Func3Sync<R, P1, P2, P3> = (p1: P1, p2: P2, p3: P3) => R

export type FuncSync<R, P1 = void, P2 = void, P3 = void> =
  | Func0Sync<R>
  | Func1Sync<R, P1>
  | Func2Sync<R, P1, P2>
  | Func3Sync<R, P1, P2, P3>

export type Func0Async<R> = Func0Sync<Promise<R>>
export type Func1Async<R, P1> = Func1Sync<Promise<R>, P1>
export type Func2Async<R, P1, P2> = Func2Sync<Promise<R>, P1, P2>
export type Func3Async<R, P1, P2, P3> = Func3Sync<Promise<R>, P1, P2, P3>

export type FuncAsync<R, P1, P2, P3> =
  | Func0Async<R>
  | Func1Async<R, P1>
  | Func2Async<R, P1, P2>
  | Func3Async<R, P1, P2, P3>

export type Func0<R> = Func0Sync<R> | Func0Async<R>
export type Func1<R, P1> = Func1Sync<R, P1> | Func1Async<R, P1>
export type Func2<R, P1, P2> = Func2Sync<R, P1, P2> | Func2Async<R, P1, P2>
export type Func3<R, P1, P2, P3> =
  | Func3Sync<R, P1, P2, P3>
  | Func3Async<R, P1, P2, P3>

export type Func<R, P1, P2, P3> =
  | FuncSync<R, P1, P2, P3>
  | FuncAsync<R, P1, P2, P3>

export function is_async<R, P1 = void, P2 = void, P3 = void>(
  // inp: Func<R, P1, P2, P3>,
  inp: Function,
): inp is FuncAsync<R, P1, P2, P3> {
  return inp?.constructor?.name == 'AsyncFunction'
}

export function is_func0<R>(inp: Function): inp is Func0Sync<R> {
  return inp.length == 0
}

export function is_func1<R, P1>(inp: Function): inp is Func1Sync<R, P1> {
  return inp.length == 1
}

export function is_func2<R, P1, P2>(
  inp: Function,
): inp is Func2Sync<R, P1, P2> {
  return inp.length == 2
}

export function is_func3<R, P1, P2, P3>(
  inp: Function,
): inp is Func3Sync<R, P1, P2, P3> {
  return inp.length == 3
}

export function is_func0_async<R>(inp: Function): inp is Func0Async<R> {
  return is_async(inp) && is_func0(inp)
}

export function is_func1_async<R, P1>(inp: Function): inp is Func1Async<R, P1> {
  return is_async(inp) && is_func1(inp)
}

export function is_func2_async<R, P1, P2>(
  inp: Function,
): inp is Func2Async<R, P1, P2> {
  return is_async(inp) && is_func2(inp)
}

export function is_func3_async<R, P1, P2, P3>(
  inp: Function,
): inp is Func3Async<R, P1, P2, P3> {
  return is_async(inp) && is_func3(inp)
}

export type Thanable<T> = {
  then: Promise<T>['then']
  catch: Promise<T>['catch']
}

export function is_thenable<T>(inp: any): inp is Thanable<T> {
  return typeof inp == 'object' && inp.hasOwnProperty('then')
}

export type CallbackFunction<T> = (err?: Error, res?: T) => void

export type SingleStageFunction<T> =
  | Func2Async<T, Error, T>
  | Func3Sync<void, Error, T, CallbackFunction<T>>

export type RunPipelineFunction<T, R> =
  | Func0Async<R | T>
  | Func0Sync<R | T | Promise<R | T> | Thanable<R | T>>
  | Func1Async<R | T, T>
  | Func1Sync<R | T | Promise<R | T> | Thanable<R | T>, T>
  | Func2Async<R | T, Error, T>
  | Func2Sync<void, T, CallbackFunction<R | T>>
  | Func3Sync<void, Error, T, CallbackFunction<T | R>>

export type Rescue<T, R> =
  // context is applied as this
  | Func1Async<R | T, Error>
  | Func1Sync<R | Promise<R> | Thanable<R>, Error>
  // not applied as this
  | Func2Async<R | T, Error | undefined, T>
  | Func2Sync<R | Promise<R> | Thanable<R>, Error, T>
  | Func3Sync<void, Error, T, CallbackFunction<R | T>>

// validate and ensure
export type ValidateFunction<T> =
  // will throw error
  | Func1Sync<boolean | Promise<boolean> | Thanable<boolean>, T>
  // will reject with error
  | Func1Async<boolean, T>
  // will return error in callback
  | Func2Sync<void, T, CallbackFunction<boolean>>

// validate and ensure
export type EnsureFunction<T> =
  // will throw error
  | Func1Sync<T | Promise<T> | Thanable<T>, T>
  // will refect with error
  | Func1Async<T, T>
  // will return error in callback
  | Func2Sync<void, T, CallbackFunction<T>>

export interface StageConfig<T = any, R = T> {
  run?: RunPipelineFunction<T, R>
  name?: string
  rescue?: Rescue<T, R>
  schema?: JSONSchemaType<T>
  ensure?: EnsureFunction<T>
  validate?: ValidateFunction<T>
  compile?<C extends StageConfig<T, R>>(
    this: IStage<T, C, R>,
    rebuild: boolean,
  ): StageRun<T, R>
  precompile?<C extends StageConfig<T, R>>(this: C): void
}

export interface PipelineConfig<T, R> extends StageConfig<T, R> {
  stages: Array<IStage<any, any, any>>
}

export interface ParallelConfig<T, R> extends StageConfig<T, R> {
  stage: IStage<T, any, R> | RunPipelineFunction<T, R>
  split?: Func1Sync<Array<any>, T | R>
  combine?: Func2Sync<T | R | void, T | R, Array<any>>
}

export type StageRun<T, R> = (
  err: Error | undefined,
  context: T,
  callback: CallbackFunction<T | R>,
) => void
