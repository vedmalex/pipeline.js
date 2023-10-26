import { Possible } from '../types';
import { ComplexError, ComplexErrorInput } from './ComplexError';
export declare function CreateError(err?: ComplexErrorInput | Array<ComplexErrorInput>): Possible<ComplexError>;
