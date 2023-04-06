import { ContextType } from '../Context';
import { Rescue, StageObject } from '../types';
export declare function execute_rescue<R extends StageObject>(rescue: Rescue, err: Error, context: ContextType<R>, done: (err?: any) => void): void;
export declare function execute_rescue_async<R extends StageObject>(rescue: Rescue, err: Error, context: ContextType<R>): Promise<[unknown, ContextType<R>]>;
//# sourceMappingURL=execute_rescue.d.ts.map