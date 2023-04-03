export function RetryOnError(stage: any): fRetryOnError;
export class fRetryOnError {
    constructor(stage: any);
    isValid(): void;
    build(): pipeline.RetryOnError<pipeline.StageObject>;
    stage(_fn: any): fRetryOnError;
    restore(fn: any): fRetryOnError;
    backup(fn: any): fRetryOnError;
    retry(fn: any): fRetryOnError;
}
import pipeline = require("pipeline.js");
//# sourceMappingURL=retryonerror.d.ts.map