"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute_rescue = void 0;
const ErrorList_1 = require("./ErrorList");
const types_1 = require("./types");
const types_2 = require("./types");
const errors_1 = require("./errors");
const process_error_1 = require("./process_error");
function execute_rescue(rescue, err, context, done) {
    switch (rescue.length) {
        case 1:
            if (types_2.is_func1_async(rescue)) {
                try {
                    rescue(err)
                        .then(_ => done())
                        .catch(done);
                }
                catch (err) {
                    process_error_1.process_error(err, done);
                }
            }
            else if (types_2.is_func1(rescue)) {
                try {
                    const res = rescue(err);
                    if (res instanceof Promise) {
                        res.then(_ => done()).catch(done);
                    }
                    else if (types_1.is_thenable(res)) {
                        res.then(_ => done()).catch(done);
                    }
                    else {
                        done();
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
            if (types_1.is_func2_async(rescue)) {
                try {
                    rescue(err, context)
                        .then(_ => done())
                        .catch(done);
                }
                catch (err) {
                    process_error_1.process_error(err, done);
                }
            }
            else if (types_2.is_func2(rescue)) {
                try {
                    const res = rescue(err, context);
                    if (res instanceof Promise) {
                        res.then(_ => done()).catch(done);
                    }
                    else if (types_1.is_thenable(res)) {
                        res.then(_ => done()).catch(done);
                    }
                    else {
                        done();
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
        case 3:
            if (types_1.is_func3(rescue) && !types_1.is_func3_async(rescue)) {
                try {
                    ;
                    rescue(err, context, done);
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
exports.execute_rescue = execute_rescue;
//# sourceMappingURL=execute_rescue.js.map