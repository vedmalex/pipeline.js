import { ParallelErrorInput } from './ParallelErrorInput';
export declare class ParallelError extends Error {
    name: string;
    stage?: string;
    index: number;
    err: unknown;
    ctx: unknown;
    constructor(init: ParallelErrorInput);
    toString(): string;
}
