export interface IStage<T> {
  get name(): string
  get reportName(): string
  toString(): string
  execute(context: T): Promise<T>
  execute(context: T, callback: CallbackFunction<T>)
  execute(err: Error, context: T, callback: CallbackFunction<T>)
  compile(rebuild?: boolean): void
  get config(): StageConfig<T>
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
  inp: any,
): inp is FuncAsync<R, P1, P2, P3> {
  return inp?.constructor?.name == 'AsyncFunction'
}

export function is_func0<R>(inp: any): inp is Func0Sync<R> {
  return inp.length == 0
}

export function is_func1<R, P1>(inp: any): inp is Func1Sync<R, P1> {
  return inp.length == 1
}

export function is_func2<R, P1, P2>(inp: any): inp is Func2Sync<R, P1, P2> {
  return inp.length == 2
}

export function is_func3<R, P1, P2, P3>(
  inp: any,
): inp is Func3Sync<R, P1, P2, P3> {
  return inp.length == 3
}

export function is_func0_async<R>(inp: any): inp is Func0Async<R> {
  return is_async(inp) && is_func0(inp)
}

export function is_func1_async<R, P1>(inp: any): inp is Func1Async<R, P1> {
  return is_async(inp) && is_func1(inp)
}

export function is_func2_async<R, P1, P2>(
  inp: any,
): inp is Func2Async<R, P1, P2> {
  return is_async(inp) && is_func2(inp)
}

export function is_func3_async<R, P1, P2, P3>(
  inp: any,
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

export type CallbackFunction<T> =
  | Func1Sync<void, Error>
  | Func2Sync<void, Error, T>

export type SingleStageFunction<T> =
  | Func2Async<T, Error, T>
  | Func3Sync<void, Error, T, CallbackFunction<T>>

export type RunPipelineConfig<T> =
  | Func0Sync<void | Promise<void> | Thanable<void>>
  | Func0Async<void>
  | Func1Sync<void | Promise<void> | Thanable<void>, T>
  | Func1Async<void, T>
  | Func2Sync<void, T, CallbackFunction<T>>
  | Func2Async<void | Promise<void> | Thanable<void>, Error, T>
  | Func3Sync<void, Error, T, CallbackFunction<T>>

export type Rescue<T> =
  // context is applied as this
  | Func1Sync<void | Promise<void> | Thanable<void>, Error>
  | Func1Async<T, Error>
  // not applied as this
  | Func2Sync<void | Promise<void> | Thanable<void>, Error, T>
  | Func2Async<void, Error, T>
  | Func3Sync<void, Error, T, CallbackFunction<T>>

export type ValidateFunction<T> =
  // will throw error
  | Func1Sync<boolean | Promise<boolean> | Thanable<boolean>, T>
  // will refect with error
  | Func1Async<boolean, T>
  // will return error in callback
  | Func2Sync<void, T, CallbackFunction<T>>

export interface StageConfig<T> {
  name?: string
  rescue?: Rescue<T>
  validate?: ValidateFunction<T>
  run: RunPipelineConfig<T>
  compile: (this: IStage<T>, rebuild: boolean) => void
  precompile: () => void
}
