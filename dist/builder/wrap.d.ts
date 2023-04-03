export function Wrap(stage: any): fWrap;
export class fWrap {
    constructor(stage: any);
    isValid(): void;
    build(): pipeline.Wrap<pipeline.StageObject, pipeline.StageObject>;
    stage(_fn: any): fWrap;
    prepare(fn: any): fWrap;
    finalize(fn: any): fWrap;
}
import pipeline = require("pipeline.js");
//# sourceMappingURL=wrap.d.ts.map