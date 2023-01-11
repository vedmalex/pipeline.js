import { IContextProxy } from '../context';
import { ComplexError } from './ErrorList';
import { Possible, Rescue } from './types';
export declare function execute_rescue<T>(rescue: Rescue<T>, err: Error, context: IContextProxy<T>, done: (err?: Possible<ComplexError>) => void): void;
//# sourceMappingURL=execute_rescue.d.ts.map