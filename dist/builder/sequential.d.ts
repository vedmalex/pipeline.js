export function Sequential(stage: any): fSequential;
export class fSequential {
    constructor(stage: any);
    isValid(): void;
    build(): pipeline.Sequential<pipeline.StageObject, pipeline.StageObject>;
    stage(_fn: any): fSequential;
    split(fn: any): fSequential;
    combine(fn: any): fSequential;
}
import pipeline = require("pipeline.js");
//# sourceMappingURL=sequential.d.ts.map