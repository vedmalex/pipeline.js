export function Parallel(stage: any): fParallel;
export class fParallel extends Base {
    constructor(stage: any);
    build(): pipeline.Parallel<any, any, cfg>;
    stage(_fn: any): fParallel;
    split(fn: any): fParallel;
    combine(fn: any): fParallel;
}
import Base = require("./base.js");
import cfg = require("./cfg.js");
import pipeline = require("pipeline.js");
//# sourceMappingURL=parallel.d.ts.map