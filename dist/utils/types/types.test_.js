"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.process_error = void 0;
const t1 = () => { };
const t2 = (err) => {
    throw err;
};
const t3 = (err, value) => {
    if (err) {
        console.log(err);
    }
    else {
        console.log(value);
    }
};
class Case {
    constructor({ value, callback }) {
        this.value = value;
        this.cb = callback;
    }
}
const tc = new Case({ value: 10, callback: t3 });
function process_error(err, done) {
    if (err instanceof Error) {
        done(err);
    }
    else if (typeof err == 'string') {
        done(new Error(err));
    }
    else {
        done(new Error(String(err)));
    }
}
exports.process_error = process_error;
//# sourceMappingURL=types.test_.js.map