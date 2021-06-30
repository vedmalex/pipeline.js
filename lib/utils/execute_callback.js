"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute_callback = void 0;
const ErrorList_1 = require("./ErrorList");
const types_1 = require("./types");
const types_2 = require("./types");
const process_error_1 = require("./process_error");
const errors_1 = require("./errors");
function execute_callback(err, run, context, done) {
    switch (run.length) {
        case 0:
            if (types_2.is_func0_async(run)) {
                try {
                    const res = run.call(context);
                    res.then(res => done(undefined, res || context)).catch(done);
                }
                catch (err) {
                    process_error_1.process_error(err, done);
                }
            }
            else if (types_2.is_func0(run)) {
                try {
                    const res = run.apply(context);
                    if (res instanceof Promise) {
                        res.then(_ => done(undefined, context)).catch(done);
                    }
                    else if (types_1.is_thenable(res)) {
                        res.then(_ => done(undefined, context)).catch(done);
                    }
                    else {
                        done(undefined, context);
                    }
                }
                catch (err) {
                    process_error_1.process_error(err, done);
                }
            }
            break;
        case 1:
            if (types_2.is_func1_async(run)) {
                try {
                    ;
                    run(context)
                        .then(ctx => done(undefined, ctx))
                        .catch(done);
                }
                catch (err) {
                    process_error_1.process_error(err, done);
                }
            }
            else if (types_2.is_func1(run)) {
                try {
                    const res = run(context);
                    if (res instanceof Promise) {
                        res.then(_ => done(undefined, context)).catch(done);
                    }
                    else if (types_1.is_thenable(res)) {
                        res.then(_ => done(undefined, context)).catch(done);
                    }
                    else {
                        done(undefined, context);
                    }
                }
                catch (err) {
                    process_error_1.process_error(err, done);
                }
            }
            else {
                done(ErrorList_1.CreateError(errors_1.ERROR.signature));
            }
            break;
        case 2:
            if (types_1.is_func2_async(run)) {
                try {
                    ;
                    run(err, context)
                        .then(ctx => done(undefined, ctx))
                        .catch(done);
                }
                catch (err) {
                    process_error_1.process_error(err, done);
                }
            }
            else if (types_2.is_func2(run)) {
                try {
                    ;
                    run(context, done);
                }
                catch (err) {
                    process_error_1.process_error(err, done);
                }
            }
            else {
                done(ErrorList_1.CreateError(errors_1.ERROR.signature));
            }
            break;
        case 3:
            if (types_1.is_func3(run) && !types_1.is_func3_async(run)) {
                try {
                    ;
                    run(err, context, done);
                }
                catch (err) {
                    process_error_1.process_error(err, done);
                }
            }
            else {
                done(ErrorList_1.CreateError(errors_1.ERROR.signature));
            }
            break;
        default:
            done(ErrorList_1.CreateError(errors_1.ERROR.signature));
    }
}
exports.execute_callback = execute_callback;
//# sourceMappingURL=execute_callback.js.map