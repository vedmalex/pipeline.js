"use strict";
var schema = require('js-schema');
var cfg = require('./cfg.js');
var validate = schema({
    name: [null, String],
    ensure: [null, Function],
    validate: [null, Function],
    schema: [null, Object],
    rescue: [null, Function],
});
class fBase {
    constructor() {
        this.cfg = new cfg();
    }
    isValid() {
        var valid = validate(this.cfg);
        if (!valid) {
            throw new Error(JSON.stringify(validate.errors(this.cfg)));
        }
    }
    rescue(fn) {
        this.cfg.rescue = fn;
        return this;
    }
    name(name) {
        this.cfg.name = name;
        return this;
    }
    validate(fn) {
        this.cfg.validate = fn;
        this.isValid();
        return this;
    }
    schema(obj) {
        this.cfg.schema = obj;
        return this;
    }
    ensure(fn) {
        this.cfg.ensure = fn;
        return this;
    }
}
module.exports = fBase;
//# sourceMappingURL=base.js.map