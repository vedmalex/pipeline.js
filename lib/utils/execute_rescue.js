"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute_rescue = execute_rescue;
const ErrorList_1 = require("./ErrorList");
const TypeDetectors_1 = require("./TypeDetectors");
const errors_1 = require("./errors");
const process_error_1 = require("./process_error");
const types_1 = require("./types");
const types_2 = require("./types");
function execute_rescue(rescue, err, context, done) {
    const cleanErr = (0, ErrorList_1.createError)(err);
    const rescueDone = (rescueErr, _ctx) => {
        if (!rescueErr) {
            done(undefined);
            return;
        }
        done((0, ErrorList_1.createError)(rescueErr));
    };
    switch (rescue.length) {
        case 1:
            if ((0, types_2.is_func1_async)(rescue)) {
                try {
                    rescue(cleanErr)
                        .then(_ => done(undefined))
                        .catch(err => (0, process_error_1.process_error)(err, done));
                }
                catch (err) {
                    (0, process_error_1.process_error)(err, done);
                }
            }
            else if ((0, types_2.is_func1)(rescue)) {
                try {
                    const res = rescue(cleanErr);
                    if ((0, TypeDetectors_1.isPromise)(res)) {
                        res.then(_ => done()).catch(err => (0, process_error_1.process_error)(err, done));
                    }
                    else if ((0, types_1.is_thenable)(res)) {
                        res.then(_ => done()).catch(err => (0, process_error_1.process_error)(err, done));
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
                done((0, ErrorList_1.createCodeError)(errors_1.ErrorCode.ERR_SIGNATURE));
            }
            break;
        case 2:
            if ((0, types_1.is_func2_async)(rescue)) {
                try {
                    rescue(cleanErr, context)
                        .then(_ => done())
                        .catch(err => (0, process_error_1.process_error)(err, done));
                }
                catch (err) {
                    (0, process_error_1.process_error)(err, done);
                }
            }
            else if ((0, types_2.is_func2)(rescue)) {
                try {
                    const res = rescue(cleanErr, context);
                    if ((0, TypeDetectors_1.isPromise)(res)) {
                        res.then(_ => done()).catch(err => (0, process_error_1.process_error)(err, done));
                    }
                    else if ((0, types_1.is_thenable)(res)) {
                        res.then(_ => done()).catch(err => (0, process_error_1.process_error)(err, done));
                    }
                    else if (res) {
                        done(cleanErr);
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
                done((0, ErrorList_1.createCodeError)(errors_1.ErrorCode.ERR_SIGNATURE));
            }
            break;
        case 3:
            if ((0, types_1.is_func3)(rescue) && !(0, types_1.is_func3_async)(rescue)) {
                try {
                    rescue(cleanErr, context, rescueDone);
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
//# sourceMappingURL=execute_rescue.js.map