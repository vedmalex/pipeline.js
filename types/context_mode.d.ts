export type ContextExecutionMode = 'legacy' | 'warn' | 'explicit';
export declare function setContextExecutionMode(mode: ContextExecutionMode): void;
export declare function getContextExecutionMode(): ContextExecutionMode;
export declare function __resetContextExecutionModeForTests(): void;
