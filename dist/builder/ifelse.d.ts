export function If(condition: any): fIfElse;
export class fIfElse {
    constructor(condition: any);
    isValid(): void;
    build(): pipeline.IfElse<pipeline.StageObject>;
    if(fn: any): fIfElse;
    then(_fn: any): fIfElse;
    else(_fn: any): fIfElse;
}
import pipeline = require("pipeline.js");
//# sourceMappingURL=ifelse.d.ts.map