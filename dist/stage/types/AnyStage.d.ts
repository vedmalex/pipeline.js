import { CallbackFunction } from './CallbackFunction';
export interface AnyStage<R> {
    config: any;
    get reportName(): string;
    get name(): string;
    toString(): string;
    execute<T>(context: unknown): Promise<T>;
    execute<T>(context: unknown, callback: CallbackFunction<R & T>): void;
    execute<T>(err: any, context: R, callback: CallbackFunction<R & T>): void;
    execute<T>(_err?: any, _context?: R, _callback?: CallbackFunction<R & T>): void | Promise<T>;
}
//# sourceMappingURL=AnyStage.d.ts.map