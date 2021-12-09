"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute_ensure = void 0;
var ErrorList_1 = require("./ErrorList");
var types_1 = require("./types");
var types_2 = require("./types");
var errors_1 = require("./errors");
var process_error_1 = require("./process_error");
function execute_ensure(ensure, context, done) {
    switch (ensure.length) {
        case 1:
            if ((0, types_2.is_func1_async)(ensure)) {
                try {
                    ;
                    ensure(context)
                        .then(function (res) { return done(undefined, res); })
                        .catch(function (err) { return done(err); });
                }
                catch (err) {
                    (0, process_error_1.process_error)(err, done);
                }
            }
            else if ((0, types_2.is_func1)(ensure)) {
                try {
                    var res = ensure(context);
                    if (res instanceof Promise) {
                        res.then(function (res) { return done(undefined, res); }).catch(function (err) { return done(err); });
                    }
                    else if ((0, types_1.is_thenable)(res)) {
                        res.then(function (res) { return done(undefined, res); }).catch(function (err) { return done(err); });
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
            if ((0, types_2.is_func2)(ensure)) {
                try {
                    ensure(context, function (err, ctx) {
                        done(err, ctx);
                    });
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
exports.execute_ensure = execute_ensure;
//# sourceMappingURL=execute_ensure.js.map