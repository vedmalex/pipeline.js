export function Wrap(stage: any): fWrap;
export class fWrap extends Base {
    constructor(stage: any);
    build(): pipeline.Wrap<any, any, cfg>;
    stage(_fn: any): fWrap;
    prepare(fn: any): fWrap;
    finalize(fn: any): fWrap;
}
import Base = require("./base.js");
import cfg = require("./cfg.js");
import pipeline = require("pipeline.js");
//# sourceMappingURL=wrap.d.ts.map