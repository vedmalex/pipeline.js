import { ContextType } from '../Context';
import { CallbackFunction } from './CallbackFunction';
import { StageObject } from './StageObject';
export type StageRun<R extends StageObject> = (err: unknown, context: ContextType<R>, callback: CallbackFunction<ContextType<R>>) => void;
//# sourceMappingURL=StageRun.d.ts.map