"use strict";
class cfg {
    constructor(c) {
        if (c) {
            this.rescue = c.rescue;
            this.name = c.name;
            this.validate = c.validate;
            this.schema = c.schema;
            this.restore = c.restore;
            this.backup = c.backup;
            this.condition = c.condition;
            this.retry = c.retry;
            this.run = c.run;
            this.ensure = c.ensure;
            this.stage = c.stage;
            this.split = c.split;
            this.combine = c.combine;
            this.success = c.success;
            this.failed = c.failed;
            this.cases = c.cases ? c.cases : undefined;
            this.stages = c.stages ? c.stages : undefined;
            this.retry = c.retry;
            this.overdue = c.overdue;
            this.prepare = c.prepare;
            this.finalize = c.finalize;
            this.timeout = c.timeout;
        }
    }
    clone() {
        var c = new cfg();
        c.rescue = this.rescue;
        c.name = this.name;
        c.validate = this.validate;
        c.schema = this.schema;
        c.restore = this.restore;
        c.condition = this.condition;
        c.backup = this.backup;
        c.retry = this.retry;
        c.run = this.run;
        c.ensure = this.ensure;
        c.stage = this.stage;
        c.split = this.split;
        c.combine = this.combine;
        c.success = this.success;
        c.failed = this.failed;
        c.cases = this.cases;
        c.stages = this.stages;
        c.retry = this.retry;
        c.overdue = this.overdue;
        c.prepare = this.prepare;
        c.finalize = this.finalize;
        c.timeout = this.timeout;
        return c;
    }
}
module.exports = cfg;
//# sourceMappingURL=cfg.js.map