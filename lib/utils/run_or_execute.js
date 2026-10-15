"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run_or_execute = run_or_execute;
const ErrorList_1 = require("./ErrorList");
const execution_signal_1 = require("../execution_signal");
const execute_callback_1 = require("./execute_callback");
const TypeDetectors_1 = require("./TypeDetectors");
const types_1 = require("./types");
function run_or_execute(stage, err, context, _done, signal) {
    const effectiveSignal = signal !== null && signal !== void 0 ? signal : (0, execution_signal_1.getExecutionSignal)(context);
    const cleanup = (0, execution_signal_1.bindExecutionSignal)(context, effectiveSignal);
    const done = ((err, ctx) => {
        cleanup();
        _done(err, ctx !== null && ctx !== void 0 ? ctx : context);
    });
    if ((0, types_1.isAnyStage)(stage)) {
        runStageSafely(stage, err, context, done);
    }
    else {
        (0, execute_callback_1.execute_callback)(err, stage, context, done);
    }
}
const STAGE_DISPATCH_STACK_LIMIT = 128;
let stageDispatchDepth = 0;
const deferStageDispatch = typeof queueMicrotask === 'function'
    ? queueMicrotask
    : (cb) => {
        Promise.resolve().then(cb);
    };
function runStageSafely(stage, err, context, done) {
    const invoke = () => {
        stageDispatchDepth++;
        try {
            stage.execute((0, ErrorList_1.normalizeExecutionErrorInput)(err), context, done);
        }
        catch (error) {
            done((0, ErrorList_1.createError)((0, TypeDetectors_1.isError)(error) ? error : String(error)), context);
        }
        finally {
            stageDispatchDepth--;
        }
    };
    if (stageDispatchDepth >= STAGE_DISPATCH_STACK_LIMIT) {
        deferStageDispatch(invoke);
    }
    else {
        invoke();
    }
}
//# sourceMappingURL=run_or_execute.js.map