export = fBase;
declare class fBase {
    cfg: cfg;
    isValid(): void;
    rescue(fn: any): fBase;
    name(name: any): fBase;
    validate(fn: any): fBase;
    schema(obj: any): fBase;
    ensure(fn: any): fBase;
}
import cfg = require("./cfg.js");
//# sourceMappingURL=base.d.ts.map