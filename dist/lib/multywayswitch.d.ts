export function MWS(): fMultiWaySwitch;
export function MWCase(fn: any): fCase;
export class fMultiWaySwitch extends Base {
    build(): pipeline.MultiWaySwitch<any, any, cfg>;
    case(_cs: any): fMultiWaySwitch;
    split(fn: any): fMultiWaySwitch;
    combine(fn: any): fMultiWaySwitch;
}
export class fCase {
    constructor(stage: any);
    cfg: cfg;
    evaluate(fn: any): fCase;
    stage(_fn: any): fCase;
    split(fn: any): fCase;
    combine(fn: any): fCase;
    build(fn: any): cfg;
}
import Base = require("./base.js");
import cfg = require("./cfg.js");
import pipeline = require("pipeline.js");
//# sourceMappingURL=multywayswitch.d.ts.map