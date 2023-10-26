import { ComplexError } from '../errors';
export type LegacyCallback<Output> = (err: ComplexError | undefined, ctx: Output) => void;
export type LegacyCallbackErr = (err: ComplexError) => void;
export type LegacyCallbackEmpty = () => void;
export type CallbackArgs<Input, Output> = {
    result: 'success';
    output: Output;
} | {
    result: 'success_empty';
} | {
    result: 'failure';
    reason: ComplexError;
    input: Input;
};
export declare function isCallbackArgs<Input, Output>(inp: unknown): inp is CallbackArgs<Input, Output>;
export declare const makeCallbackArgs: <Input, Output>(_err?: unknown, res?: unknown) => CallbackArgs<Input, Output>;
export declare function makeCallback<Input, Output>(fn: LegacyCallback<Output>): CallbackFunction<Input, Output>;
export declare function makeLegacyCallback<Input, Output>(callback: CallbackFunction<Input, Output>): (err: unknown, res: Output) => void;
export type CallbackFunction<Input, Output> = (args: CallbackArgs<Input, Output>) => void;
export declare function isCallbackFunction<Input, Output>(inp?: unknown): inp is CallbackFunction<Input, Output>;
