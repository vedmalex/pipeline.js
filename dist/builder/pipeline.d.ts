export function Pipeline(stage: any): fPipeline;
export class fPipeline {
    constructor(stage: any);
    isValid(): void;
    build(): pipeline.Pipeline<pipeline.StageObject>;
    stage(_fn: any): fPipeline;
}
import pipeline = require("pipeline.js");
//# sourceMappingURL=pipeline.d.ts.map