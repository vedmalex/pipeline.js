export declare const ErrorCode: {
    readonly ERR_SIGNATURE: 'ERR_SIGNATURE';
    readonly ERR_INVALID_CONTEXT: 'ERR_INVALID_CONTEXT';
    readonly ERR_NO_RUN: 'ERR_NO_RUN';
    readonly ERR_STAGE_TIMEOUT: 'ERR_STAGE_TIMEOUT';
    readonly ERR_CALLBACK_DOUBLE: 'ERR_CALLBACK_DOUBLE';
    readonly ERR_CONTEXT_TYPE: 'ERR_CONTEXT_TYPE';
    readonly ERR_UNKNOWN: 'ERR_UNKNOWN';
    readonly ERR_PC_OUT_OF_BOUNDS: 'ERR_PC_OUT_OF_BOUNDS';
    readonly ERR_OPCODE_NOT_IMPL: 'ERR_OPCODE_NOT_IMPL';
    readonly ERR_STAGE_THROW: 'ERR_STAGE_THROW';
    readonly ERR_STAGE_ABORTED: 'ERR_STAGE_ABORTED';
};
export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];
export declare const ErrorMessage: Record<ErrorCodeType, string>;
export declare const ERROR: {
    signature: string;
    invalid_context: string;
};
