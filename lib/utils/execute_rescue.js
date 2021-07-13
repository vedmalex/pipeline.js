"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute_rescue = void 0;
var ErrorList_1 = require("./ErrorList");
var types_1 = require("./types");
var types_2 = require("./types");
var errors_1 = require("./errors");
var process_error_1 = require("./process_error");
function execute_rescue(rescue, err, context, done) {
    switch (rescue.length) {
        case 1:
            if ((0, types_2.is_func1_async)(rescue)) {
                try {
                    rescue(err)
                        .then(function (_) { return done(); })
                        .catch(done);
                }
                catch (err) {
                    (0, process_error_1.process_error)(err, done);
                }
            }
            else if ((0, types_2.is_func1)(rescue)) {
                try {
                    var res = rescue(err);
                    if (res instanceof Promise) {
                        res.then(function (_) { return done(); }).catch(done);
                    }
                    else if ((0, types_1.is_thenable)(res)) {
                        res.then(function (_) { return done(); }).catch(done);
                    }
                    else {
                        done();
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
            if ((0, types_1.is_func2_async)(rescue)) {
                try {
                    rescue(err, context)
                        .then(function (_) { return done(); })
                        .catch(done);
                }
                catch (err) {
                    (0, process_error_1.process_error)(err, done);
                }
            }
            else if ((0, types_2.is_func2)(rescue)) {
                try {
                    var res = rescue(err, context);
                    if (res instanceof Promise) {
                        res.then(function (_) { return done(); }).catch(done);
                    }
                    else if ((0, types_1.is_thenable)(res)) {
                        res.then(function (_) { return done(); }).catch(done);
                    }
                    else {
                        done();
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
        case 3:
            if ((0, types_1.is_func3)(rescue) && !(0, types_1.is_func3_async)(rescue)) {
                try {
                    ;
                    rescue(err, context, done);
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
exports.execute_rescue = execute_rescue;
//# sourceMappingURL=execute_rescue.js.map