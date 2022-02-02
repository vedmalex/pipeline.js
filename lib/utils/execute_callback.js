"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute_callback = void 0;
var ErrorList_1 = require("./ErrorList");
var errors_1 = require("./errors");
var process_error_1 = require("./process_error");
var run_callback_once_1 = require("./run_callback_once");
var types_1 = require("./types");
var types_2 = require("./types");
function execute_callback(err, run, context, _done) {
    var done = (0, run_callback_once_1.run_callback_once)(_done);
    switch (run.length) {
        case 0:
            if ((0, types_2.is_func0_async)(run)) {
                try {
                    var res = run.call(context);
                    res
                        .then(function (res) { return done(undefined, res !== null && res !== void 0 ? res : context); })
                        .catch(function (err) { return done(err); });
                }
                catch (err) {
                    (0, process_error_1.process_error)(err, done);
                }
            }
            else if ((0, types_2.is_func0)(run)) {
                try {
                    var res_1 = run.apply(context);
                    if (res_1 instanceof Promise) {
                        res_1
                            .then(function (_) { return done(undefined, res_1 !== null && res_1 !== void 0 ? res_1 : context); })
                            .catch(function (err) { return done(err); });
                    }
                    else if ((0, types_1.is_thenable)(res_1)) {
                        res_1
                            .then(function (_) { return done(undefined, res_1 !== null && res_1 !== void 0 ? res_1 : context); })
                            .catch(function (err) { return done(err); });
                    }
                    else {
                        done(undefined, res_1 !== null && res_1 !== void 0 ? res_1 : context);
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
                    var res = run(context);
                    if (res instanceof Promise) {
                        res
                            .then(function (r) { return done(undefined, r !== null && r !== void 0 ? r : context); })
                            .catch(function (err) { return done(err); });
                    }
                    else if ((0, types_1.is_thenable)(res)) {
                        res
                            .then(function (r) { return done(undefined, r !== null && r !== void 0 ? r : context); })
                            .catch(function (err) { return done(err); });
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
                    run(err, context)
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
                    run(context, done);
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
                    run(err, context, done);
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
}
exports.execute_callback = execute_callback;
//# sourceMappingURL=execute_callback.js.map