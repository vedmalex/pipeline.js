import { StageObject } from './utils/types';
import { IContextProxy } from './IContextProxy';
export type ContextType<T> = T extends StageObject ? IContextProxy<T> & T : never;
//# sourceMappingURL=ContextType.d.ts.map