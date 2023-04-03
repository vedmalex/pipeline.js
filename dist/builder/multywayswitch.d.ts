export function MWS(): fMultiWaySwitch;
export function MWCase(fn: any): fCase;
export class fMultiWaySwitch {
    isValid(): void;
    build(): pipeline.MultiWaySwitch<pipeline.StageObject, pipeline.StageObject>;
    case(_cs: any): fMultiWaySwitch;
    split(fn: any): fMultiWaySwitch;
    combine(fn: any): fMultiWaySwitch;
}
export class fCase {
    constructor(stage: any);
    cfg: any;
    evaluate(fn: any): fCase;
    stage(_fn: any): fCase;
    split(fn: any): fCase;
    combine(fn: any): fCase;
    build(fn: any): any;
}
import pipeline = require("pipeline.js");
//# sourceMappingURL=multywayswitch.d.ts.map