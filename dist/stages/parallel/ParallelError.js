"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParallelError = void 0;
class ParallelError extends Error {
    constructor(init) {
        super();
        this.name = 'ParallerStageError';
        this.stage = init.stage;
        this.ctx = init.ctx;
        this.err = init.err;
        this.index = init.index;
    }
    toString() {
        return `${this.name}: at stage ${this.stage} error occured:
    iteration ${this.index}
    ${this.err}`;
    }
}
exports.ParallelError = ParallelError;
//# sourceMappingURL=ParallelError.js.map