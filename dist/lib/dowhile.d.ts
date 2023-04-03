export function DoWhile(stage: any): fDoWhile;
export class fDoWhile extends fBase {
    constructor(stage: any);
    build(): pipeline.DoWhile<any, any, cfg>;
    stage(_fn: any): fDoWhile;
    split(fn: any): fDoWhile;
    reachEnd(fn: any): fDoWhile;
}
import fBase = require("./base.js");
import cfg = require("./cfg.js");
import pipeline = require("pipeline.js");
//# sourceMappingURL=dowhile.d.ts.map