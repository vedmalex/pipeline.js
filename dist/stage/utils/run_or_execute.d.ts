import { ContextType } from '../Context';
import { CallbackFunction, StageObject } from '../types';
export declare function run_or_execute<R extends StageObject>(stage: unknown, err: unknown, context: ContextType<R>, _done: CallbackFunction<ContextType<R>>): void;
export declare function run_or_execute_async<R extends StageObject>(stage: unknown, err: unknown, context: ContextType<R>): Promise<[unknown, ContextType<R>]>;
//# sourceMappingURL=run_or_execute.d.ts.map