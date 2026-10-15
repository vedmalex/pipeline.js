"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute_callback = execute_callback;
const ErrorList_1 = require("./ErrorList");
const TypeDetectors_1 = require("./TypeDetectors");
const errors_1 = require("./errors");
const process_error_1 = require("./process_error");
const run_callback_once_1 = require("./run_callback_once");
const types_1 = require("./types");
const types_2 = require("./types");
function execute_callback(err, run, context, _done) {
    const done = (0, run_callback_once_1.run_callback_once)(_done);
    switch (run.length) {
        case 0:
            if ((0, types_2.is_func0_async)(run)) {
                try {
                    const res = run.call(context);
                    res
                        .then(res => done(undefined, res !== null && res !== void 0 ? res : context))
                        .catch(err => done(err));
                }
                catch (err) {
                    (0, process_error_1.process_error)(err, done);
                }
            }
            else if ((0, types_2.is_func0)(run)) {
                try {
                    const res = run.apply(context);
                    if ((0, TypeDetectors_1.isPromise)(res)) {
                        res
                            .then(_ => done(undefined, res !== null && res !== void 0 ? res : context))
                            .catch(err => done(err));
                    }
                    else if ((0, types_1.is_thenable)(res)) {
                        res
                            .then(_ => done(undefined, res !== null && res !== void 0 ? res : context))
                            .catch(err => done(err));
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
            if ((0, types_2.is_func1_async)(run)) {
                try {
                    run(context)
                        .then(ctx => done(undefined, ctx))
                        .catch(err => done(err));
                }
                catch (err) {
                    (0, process_error_1.process_error)(err, done);
                }
            }
            else if ((0, types_2.is_func1)(run)) {
                try {
                    const res = run(context);
                    if ((0, TypeDetectors_1.isPromise)(res)) {
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
                done((0, ErrorList_1.createCodeError)(errors_1.ErrorCode.ERR_SIGNATURE));
            }
            break;
        case 2:
            if ((0, types_1.is_func2_async)(run)) {
                try {
                    run(err, context)
                        .then(ctx => done(undefined, ctx))
                        .catch(err => done(err));
                }
                catch (err) {
                    (0, process_error_1.process_error)(err, done);
                }
            }
            else if ((0, types_2.is_func2)(run)) {
                try {
                    ;
                    run(context, done);
                }
                catch (err) {
                    (0, process_error_1.process_error)(err, done);
                }
            }
            else {
                done((0, ErrorList_1.createCodeError)(errors_1.ErrorCode.ERR_SIGNATURE));
            }
            break;
        case 3:
            if ((0, types_1.is_func3)(run) &&
                !(0, types_1.is_func3_async)(run)) {
                try {
                    run(err, context, done);
                }
                catch (err) {
                    (0, process_error_1.process_error)(err, done);
                }
            }
            else {
                done((0, ErrorList_1.createCodeError)(errors_1.ErrorCode.ERR_SIGNATURE));
            }
            break;
        default:
            done((0, ErrorList_1.createCodeError)(errors_1.ErrorCode.ERR_SIGNATURE));
    }
}
//# sourceMappingURL=execute_callback.js.map