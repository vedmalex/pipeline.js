export function Timeout(st: any): fTimeout;
export class fTimeout extends Base {
    constructor(stage: any);
    build(): pipeline.Timeout<any, cfg>;
    stage(_fn: any): fTimeout;
    timeout(inp: any): fTimeout;
    overdue(_fn: any): fTimeout;
}
import Base = require("./base.js");
import cfg = require("./cfg.js");
import pipeline = require("pipeline.js");
//# sourceMappingURL=timeout.d.ts.map