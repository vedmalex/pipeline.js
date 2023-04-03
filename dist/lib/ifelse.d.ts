export function If(condition: any): fIfElse;
export class fIfElse extends fBase {
    constructor(condition: any);
    build(): pipeline.IfElse<any, cfg>;
    if(fn: any): fIfElse;
    then(_fn: any): fIfElse;
    else(_fn: any): fIfElse;
}
import fBase = require("./base.js");
import cfg = require("./cfg.js");
import pipeline = require("pipeline.js");
//# sourceMappingURL=ifelse.d.ts.map