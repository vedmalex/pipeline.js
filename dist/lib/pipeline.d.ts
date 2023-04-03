export function Pipeline(stage: any): fPipeline;
export class fPipeline extends Base {
    constructor(stage: any);
    build(): pipeline.Pipeline<any, cfg>;
    stage(_fn: any): fPipeline;
}
import Base = require("./base.js");
import cfg = require("./cfg.js");
import pipeline = require("pipeline.js");
//# sourceMappingURL=pipeline.d.ts.map