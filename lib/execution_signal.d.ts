import { StageObject } from './utils/types';
export declare function bindExecutionSignal<T extends StageObject>(ctx: T, signal?: AbortSignal): () => void;
export declare function getExecutionSignal<T extends StageObject>(ctx?: T): AbortSignal | undefined;
export declare function getExecutionAbortError(reason?: unknown): import(".").CleanError | Error;
export declare function getPublicExecutionAbortError(reason?: unknown): import(".").CleanError | Error;
export declare function createLinkedAbortController(signal?: AbortSignal): {
    controller: AbortController;
    cleanup: () => void;
};
export declare function isExecutionAborted<T extends StageObject>(ctx?: T): boolean;
export declare function throwIfExecutionAborted<T extends StageObject>(ctx?: T): void;
//# sourceMappingURL=execution_signal.d.ts.map