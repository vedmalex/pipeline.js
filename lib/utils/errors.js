"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR = exports.ErrorMessage = exports.ErrorCode = void 0;
exports.ErrorCode = {
    ERR_SIGNATURE: 'ERR_SIGNATURE',
    ERR_INVALID_CONTEXT: 'ERR_INVALID_CONTEXT',
    ERR_NO_RUN: 'ERR_NO_RUN',
    ERR_STAGE_TIMEOUT: 'ERR_STAGE_TIMEOUT',
    ERR_CALLBACK_DOUBLE: 'ERR_CALLBACK_DOUBLE',
    ERR_CONTEXT_TYPE: 'ERR_CONTEXT_TYPE',
    ERR_UNKNOWN: 'ERR_UNKNOWN',
    ERR_PC_OUT_OF_BOUNDS: 'ERR_PC_OUT_OF_BOUNDS',
    ERR_OPCODE_NOT_IMPL: 'ERR_OPCODE_NOT_IMPL',
    ERR_STAGE_THROW: 'ERR_STAGE_THROW',
    ERR_STAGE_ABORTED: 'ERR_STAGE_ABORTED',
};
exports.ErrorMessage = {
    [exports.ErrorCode.ERR_SIGNATURE]: 'unacceptable run method signature',
    [exports.ErrorCode.ERR_INVALID_CONTEXT]: 'context is invalid',
    [exports.ErrorCode.ERR_NO_RUN]: 'run is not a function',
    [exports.ErrorCode.ERR_STAGE_TIMEOUT]: 'stage timeout occurred',
    [exports.ErrorCode.ERR_CALLBACK_DOUBLE]: 'callback called more than once',
    [exports.ErrorCode.ERR_CONTEXT_TYPE]: 'context is not a Context object',
    [exports.ErrorCode.ERR_UNKNOWN]: 'unknown error occurred',
    [exports.ErrorCode.ERR_PC_OUT_OF_BOUNDS]: 'compiled executor pc out of bounds',
    [exports.ErrorCode.ERR_OPCODE_NOT_IMPL]: 'opcode not implemented in current executor phase',
    [exports.ErrorCode.ERR_STAGE_THROW]: 'stage threw an error',
    [exports.ErrorCode.ERR_STAGE_ABORTED]: 'stage execution aborted',
};
exports.ERROR = {
    signature: exports.ErrorMessage[exports.ErrorCode.ERR_SIGNATURE],
    invalid_context: exports.ErrorMessage[exports.ErrorCode.ERR_INVALID_CONTEXT],
};
//# sourceMappingURL=errors.js.map