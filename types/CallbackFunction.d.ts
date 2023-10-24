export type LegacyCallback<Output> = (err: Error | undefined, data?: Output) => void;
export type CallbackArgs<Input, Output> = {
    result: 'success';
    output: Output;
} | {
    result: 'success_empty';
} | {
    result: 'failure';
    reason: Error;
    input: Input;
};
export declare function isCallbackArgs<Input, Output>(inp: unknown): inp is CallbackArgs<Input, Output>;
export declare function makeCallbackArgs<Input, Output>(err: Error | undefined, res?: Output): CallbackArgs<Input, Output>;
export declare function makeCallback<Input, Output>(fn: LegacyCallback<Output>): CallbackFunction<Input, Output>;
export declare function makeLegacyCallback<Input, Output>(callback: CallbackFunction<Input, Output>): (err: Error | undefined, res: Output) => void;
export type CallbackFunction<Input, Output> = (args: CallbackArgs<Input, Output>) => void;
