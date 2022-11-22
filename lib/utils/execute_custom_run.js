"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute_custom_run = void 0;
var ErrorList_1 = require("./ErrorList");
var errors_1 = require("./errors");
var process_error_1 = require("./process_error");
var run_callback_once_1 = require("./run_callback_once");
var types_1 = require("./types");
var types_2 = require("./types");
function execute_custom_run(run) {
    return function (err, context, _done) {
        var done = (0, run_callback_once_1.run_callback_once)(_done);
        switch (run.length) {
            case 0:
                if ((0, types_2.is_func0_async)(run)) {
                    try {
                        var res = run.call(context);
                        res.then(function (r) { return done(undefined, r); }).catch(function (err) { return done(err); });
                    }
                    catch (err) {
                        (0, process_error_1.process_error)(err, done);
                    }
                }
                else if ((0, types_2.is_func0)(run)) {
                    try {
                        var res = run.apply(context);
                        if (res instanceof Promise) {
                            res.then(function (r) { return done(undefined, r); }).catch(function (err) { return done(err); });
                        }
                        else if ((0, types_1.is_thenable)(res)) {
                            res.then(function (r) { return done(undefined, r); }).catch(function (err) { return done(err); });
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
                if ((0, types_2.is_func1_async)(run)) {
                    try {
                        ;
                        run(context)
                            .then(function (ctx) { return done(undefined, ctx); })
                            .catch(function (err) { return done(err); });
                    }
                    catch (err) {
                        (0, process_error_1.process_error)(err, done);
                    }
                }
                else if ((0, types_2.is_func1)(run)) {
                    try {
                        var res = run.call(this, context);
                        if (res instanceof Promise) {
                            res.then(function (r) { return done(undefined, r); }).catch(function (err) { return done(err); });
                        }
                        else if ((0, types_1.is_thenable)(res)) {
                            res.then(function (r) { return done(undefined, r); }).catch(function (err) { return done(err); });
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
                if ((0, types_1.is_func2_async)(run)) {
                    try {
                        ;
                        run
                            .call(this, err, context)
                            .then(function (ctx) { return done(undefined, ctx); })
                            .catch(function (err) { return done(err); });
                    }
                    catch (err) {
                        (0, process_error_1.process_error)(err, done);
                    }
                }
                else if ((0, types_2.is_func2)(run)) {
                    try {
                        ;
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
                if ((0, types_1.is_func3)(run) && !(0, types_1.is_func3_async)(run)) {
                    try {
                        ;
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