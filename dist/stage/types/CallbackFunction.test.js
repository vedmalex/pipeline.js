"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
require("jest");
const z = tslib_1.__importStar(require("zod"));
const CallbackFunction_1 = require("./CallbackFunction");
describe('CallbackFunction', () => {
    it('should validate a function', () => {
        expect((0, CallbackFunction_1.isCallbackFunction)(() => { })).toBe(true);
        expect((0, CallbackFunction_1.isCallbackFunction)(err => { })).toBe(true);
        expect((0, CallbackFunction_1.isCallbackFunction)((err, ctx) => { })).toBe(true);
        expect((0, CallbackFunction_1.isCallbackFunction)((err, ctx, another) => { })).toBe(false);
    });
    it('works with function', () => {
        const myFunction = z.function(z.tuple([z.string(), z.number()]), z.boolean());
        expect(myFunction.implement((some, other) => {
            return Boolean(some + other);
        })('one', 1)).toBe(true);
    });
});
//# sourceMappingURL=CallbackFunction.test.js.map