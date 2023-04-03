"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute_callback = void 0;
const CreateError_1 = require("./errors/CreateError");
const errors_1 = require("./errors");
const process_error_1 = require("./errors/process_error");
const run_callback_once_1 = require("./run_callback_once");
const types_1 = require("./types");
const types_2 = require("./types");
function execute_callback(err, run, context, _done) {
    const done = (0, run_callback_once_1.run_callback_once)(_done);
    if ((0, types_2.isStageCallbackFunction)(run))
        switch (run.length) {
            case 0:
                if ((0, types_2.isCallback0Async)(run)) {
                    try {
                        const res = run.call(context);
                        res.then(res => done(undefined, res !== null && res !== void 0 ? res : context)).catch(err => done(err));
                    }
                    catch (err) {
                        (0, process_error_1.process_error)(err, done);
                    }
                }
                else if ((0, types_2.isCallback0Sync)(run)) {
                    try {
                        const res = run.apply(context);
                        if (res instanceof Promise) {
                            res.then(_ => done(undefined, res !== null && res !== void 0 ? res : context)).catch(err => done(err));
                        }
                        else if ((0, types_1.is_thenable)(res)) {
                            res.then(_ => done(undefined, res !== null && res !== void 0 ? res : context)).catch(err => done(err));
                        }
                        else {
                            done(undefined, res !== null && res !== void 0 ? res : context);
                        }
                    }
                    catch (err) {
                        (0, process_error_1.process_error)(err, done);
                    }
                }
                break;
            case 1:
                if ((0, types_2.isCallback1Async)(run)) {
                    try {
                        run
                            .call(this, context)
                            .then(ctx => done(undefined, ctx))
                            .catch(err => done(err));
                    }
                    catch (err) {
                        (0, process_error_1.process_error)(err, done);
                    }
                }
                else if ((0, types_2.isCallback1Sync)(run)) {
                    try {
                        const res = run.call(this, context);
                        if (res instanceof Promise) {
                            res.then(r => done(undefined, r !== null && r !== void 0 ? r : context)).catch(err => done(err));
                        }
                        else if ((0, types_1.is_thenable)(res)) {
                            res.then(r => done(undefined, r !== null && r !== void 0 ? r : context)).catch(err => done(err));
                        }
                        else {
                            done(undefined, res);
                        }
                    }
                    catch (err) {
                        (0, process_error_1.process_error)(err, done);
                    }
                }
                else {
                    done((0, CreateError_1.CreateError)(errors_1.ERROR.signature));
                }
                break;
            case 2:
                if ((0, types_2.isCallback2Async)(run)) {
                    try {
                        run
                            .call(this, err, context)
                            .then(ctx => done(undefined, ctx))
                            .catch(err => done(err));
                    }
                    catch (err) {
                        (0, process_error_1.process_error)(err, done);
                    }
                }
                else if ((0, types_2.isCallback2Callback)(run)) {
                    try {
                        run.call(this, context, done);
                    }
                    catch (err) {
                        (0, process_error_1.process_error)(err, done);
                    }
                }
                else {
                    done((0, CreateError_1.CreateError)(errors_1.ERROR.signature));
                }
                break;
            case 3:
                if ((0, types_2.isCallback3Callback)(run)) {
                    try {
                        run.call(this, err, context, done);
                    }
                    catch (err) {
                        (0, process_error_1.process_error)(err, done);
                    }
                }
                else {
                    done((0, CreateError_1.CreateError)(errors_1.ERROR.signature));
                }
                break;
            default:
                done((0, CreateError_1.CreateError)(errors_1.ERROR.signature));
        }
}
exports.execute_callback = execute_callback;
//# sourceMappingURL=execute_callback.js.map