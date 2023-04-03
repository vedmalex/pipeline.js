export function Parallel(stage: any): fParallel;
export class fParallel {
    constructor(stage: any);
    isValid(): void;
    build(): pipeline.Parallel<pipeline.StageObject, pipeline.StageObject>;
    stage(_fn: any): fParallel;
    split(fn: any): fParallel;
    combine(fn: any): fParallel;
}
import pipeline = require("pipeline.js");
//# sourceMappingURL=parallel.d.ts.map