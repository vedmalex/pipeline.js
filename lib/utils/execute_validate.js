"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute_validate = void 0;
var ErrorList_1 = require("./ErrorList");
var types_1 = require("./types");
var types_2 = require("./types");
var errors_1 = require("./errors");
var process_error_1 = require("./process_error");
function execute_validate(validate, context, done) {
    switch (validate.length) {
        case 1:
            if ((0, types_2.is_func1_async)(validate)) {
                try {
                    ;
                    validate(context)
                        .then(function (res) { return done(undefined, res); })
                        .catch(function (err) { return done(err); });
                }
                catch (err) {
                    (0, process_error_1.process_error)(err, done);
                }
            }
            else if ((0, types_2.is_func1)(validate)) {
                try {
                    var res = validate(context);
                    if (res instanceof Promise) {
                        res.then(function (res) { return done(undefined, res); }).catch(function (err) { return done(err); });
                    }
                    else if ((0, types_1.is_thenable)(res)) {
                        res.then(function (res) { return done(undefined, res); }).catch(function (err) { return done(err); });
                    }
                    else if (typeof res == 'boolean') {
                        if (res) {
                            done(undefined, res);
                        }
                        else {
                            done((0, ErrorList_1.CreateError)(errors_1.ERROR.invalid_context));
                        }
                    }
                    else {
                        done(res);
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
            if ((0, types_2.is_func2)(validate)) {
                try {
                    validate(context, function (err, res) {
                        done(err, res);
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
exports.execute_validate = execute_validate;
//# sourceMappingURL=execute_validate.js.map