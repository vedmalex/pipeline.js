import { CallbackFunction, LegacyCallback } from './CallbackFunction';
export interface AnyStage<Input, Output> {
    get config(): unknown;
    get reportName(): string;
    get name(): string;
    toString(): string;
    execute(_err?: unknown, _context?: Input, _callback?: LegacyCallback<Output>): void | Promise<Output>;
    exec(_err?: unknown, _context?: Input, _callback?: CallbackFunction<Input, Output>): void | Promise<Output>;
}
