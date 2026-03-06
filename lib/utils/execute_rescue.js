"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute_rescue = execute_rescue;
var ErrorList_1 = require("./ErrorList");
var TypeDetectors_1 = require("./TypeDetectors");
var errors_1 = require("./errors");
var process_error_1 = require("./process_error");
var types_1 = require("./types");
var types_2 = require("./types");
function execute_rescue(rescue, err, context, done) {
    switch (rescue.length) {
        case 1:
            if ((0, types_2.is_func1_async)(rescue)) {
                try {
                    rescue((0, ErrorList_1.createError)(err))
                        .then(function (_) { return done(undefined); })
                        .catch(function (err) { return done(err); });
                }
                catch (err) {
                    (0, process_error_1.process_error)(err, done);
                }
            }
            else if ((0, types_2.is_func1)(rescue)) {
                try {
                    var res = rescue((0, ErrorList_1.createError)(err));
                    if ((0, TypeDetectors_1.isPromise)(res)) {
                        res.then(function (_) { return done(); }).catch(function (err) { return done(err); });
                    }
                    else if ((0, types_1.is_thenable)(res)) {
                        res.then(function (_) { return done(); }).catch(function (err) { return done(err); });
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
                done((0, ErrorList_1.createError)(errors_1.ERROR.signature));
            }
            break;
        case 2:
            if ((0, types_1.is_func2_async)(rescue)) {
                try {
                    rescue((0, ErrorList_1.createError)(err), context)
                        .then(function (_) { return done(); })
                        .catch(function (err) { return done(err); });
                }
                catch (err) {
                    (0, process_error_1.process_error)(err, done);
                }
            }
            else if ((0, types_2.is_func2)(rescue)) {
                try {
                    var res = rescue((0, ErrorList_1.createError)(err), context);
                    if ((0, TypeDetectors_1.isPromise)(res)) {
                        res.then(function (_) { return done(); }).catch(function (err) { return done(err); });
                    }
                    else if ((0, types_1.is_thenable)(res)) {
                        res.then(function (_) { return done(); }).catch(function (err) { return done(err); });
                    }
                    else if (res) {
                        done(err);
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
                done((0, ErrorList_1.createError)(errors_1.ERROR.signature));
            }
            break;
        case 3:
            if ((0, types_1.is_func3)(rescue) && !(0, types_1.is_func3_async)(rescue)) {
                try {
                    rescue((0, ErrorList_1.createError)(err), context, done);
                }
                catch (err) {
                    (0, process_error_1.process_error)(err, done);
                }
            }
            else {
                done((0, ErrorList_1.createError)(errors_1.ERROR.signature));
            }
            break;
        default:
            done((0, ErrorList_1.createError)(errors_1.ERROR.signature));
    }
}
//# sourceMappingURL=execute_rescue.js.map