import { ContextType } from '../Context';
import { CallbackFunction } from './CallbackFunction';
import { StageObject } from './StageObject';
export type EnsureSync<R extends StageObject> = (ctx: ContextType<R>) => ContextType<R>;
export type EnsureAsync<R extends StageObject> = (ctx: ContextType<R>) => Promise<ContextType<R>>;
export type EnsureCallback<R extends StageObject> = (ctx: R, done: CallbackFunction<ContextType<R>>) => void;
export declare function isEnsureSync<R extends StageObject>(inp: unknown): inp is EnsureSync<R>;
export declare function isEnsureAsync<R extends StageObject>(inp: unknown): inp is EnsureAsync<R>;
export declare function isEnsureCallback<R extends StageObject>(inp: unknown): inp is EnsureCallback<R>;
export declare function isEnsureFunction<R extends StageObject>(inp: unknown): inp is EnsureFunction<R>;
export type EnsureFunction<R extends StageObject> = EnsureSync<R> | EnsureAsync<R> | EnsureCallback<R>;
//# sourceMappingURL=EnsureFunction.d.ts.map