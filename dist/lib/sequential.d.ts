export function Sequential(stage: any): fSequential;
export class fSequential extends Base {
    constructor(stage: any);
    build(): pipeline.Sequential<any, any, cfg>;
    stage(_fn: any): fSequential;
    split(fn: any): fSequential;
    combine(fn: any): fSequential;
}
import Base = require("./base.js");
import cfg = require("./cfg.js");
import pipeline = require("pipeline.js");
//# sourceMappingURL=sequential.d.ts.map