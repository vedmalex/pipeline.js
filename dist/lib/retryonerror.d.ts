export function RetryOnError(stage: any): fRetryOnError;
export class fRetryOnError extends Base {
    constructor(stage: any);
    build(): pipeline.RetryOnError<any, any, cfg>;
    stage(_fn: any): fRetryOnError;
    restore(fn: any): fRetryOnError;
    backup(fn: any): fRetryOnError;
    retry(fn: any): fRetryOnError;
}
import Base = require("./base.js");
import cfg = require("./cfg.js");
import pipeline = require("pipeline.js");
//# sourceMappingURL=retryonerror.d.ts.map