export function Timeout(st: any): fTimeout;
export class fTimeout {
    constructor(stage: any);
    isValid(): void;
    build(): pipeline.Timeout<pipeline.StageObject>;
    stage(_fn: any): fTimeout;
    timeout(inp: any): fTimeout;
    overdue(_fn: any): fTimeout;
}
import pipeline = require("pipeline.js");
//# sourceMappingURL=timeout.d.ts.map