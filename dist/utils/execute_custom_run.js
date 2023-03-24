"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute_custom_run = void 0;
const ErrorList_1 = require("./ErrorList");
const errors_1 = require("./errors");
const process_error_1 = require("./process_error");
const run_callback_once_1 = require("./run_callback_once");
const types_1 = require("./types/types");
function execute_custom_run(run) {
    return function (err, context, _done) {
        const done = (0, run_callback_once_1.run_callback_once)(_done);
        switch (run.length) {
            case 0:
                if ((0, types_1.isCustomRun0Async)(run)) {
                    try {
                        run
                            .apply(context)
                            .then(res => done(undefined, res))
                            .catch(err => done(err));
                    }
                    catch (err) {
                        (0, process_error_1.process_error)(err, done);
                    }
                }
                else if ((0, types_1.isCustomRun0Sync)(run)) {
                    try {
                        const res = run.apply(context);
                        if (res instanceof Promise) {
                            res.then(r => done(undefined, r)).catch(err => done(err));
                        }
                        else if ((0, types_1.is_thenable)(res)) {
                            res.then(r => done(undefined, r)).catch(err => done(err));
                        }
                        else {
                            done(undefined, res);
                        }
                    }
                    catch (err) {
                        (0, process_error_1.process_error)(err, done);
                    }
                }
                break;
            case 1:
                if ((0, types_1.isCustomRun1Async)(run)) {
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
                else if ((0, types_1.isCustomRun1Sync)(run)) {
                    try {
                        const res = run.call(this, context);
                        if (res instanceof Promise) {
                            res.then(r => done(undefined, r)).catch(err => done(err));
                        }
                        else if ((0, types_1.is_thenable)(res)) {
                            res.then(r => done(undefined, r)).catch(err => done(err));
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
                    done((0, ErrorList_1.CreateError)(errors_1.ERROR.signature));
                }
                break;
            case 2:
                if ((0, types_1.isCustomRun2Async)(run)) {
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
                else if ((0, types_1.isCustomRun2Callback)(run)) {
                    try {
                        run.call(this, context, done);
                    }
                    catch (err) {
                        (0, process_error_1.process_error)(err, done);
                    }
                }
                else {
                    done((0, ErrorList_1.CreateError)(errors_1.ERROR.signature));
                }
                break;
            case 3:
                if ((0, types_1.isCustomRun3Callback)(run)) {
                    try {
                        run.call(this, err, context, done);
                    }
                    catch (err) {
                        (0, process_error_1.process_error)(err, done);
                    }
                }
                else {
                    done((0, ErrorList_1.CreateError)(errors_1.ERROR.signature));
                }
                break;
            default:
                done((0, ErrorList_1.CreateError)(errors_1.ERROR.signature));
        }
    };
}
exports.execute_custom_run = execute_custom_run;
//# sourceMappingURL=execute_custom_run.js.map