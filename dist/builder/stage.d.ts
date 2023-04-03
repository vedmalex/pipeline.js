export function Stage(fn: any): fStage;
export class fStage {
    constructor(stage: any);
    isValid(): void;
    build(): pipeline.Stage<pipeline.StageObject, any>;
    stage(_fn: any): fStage;
}
import pipeline = require("pipeline.js");
//# sourceMappingURL=stage.d.ts.map