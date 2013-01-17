var reserved = {
	"$$$errors": 1,
	"hasErrors": 1,
	"addError": 1,
	"getErrors": 1,
	"getChilds": 1,
	"getParent": 1,
	"$$$childs": 1,
	"$$$parent": 1,
	"fork": 1
};

function Context(config) {
	if(config) {
		var val;
		for(var prop in config) {
			val = config[prop];
			if(!reserved[prop]) {
				if(val !== undefined && val !== null)
					this[prop] = config[prop];
			}
		}
	}
}

exports.Context = Context;

Context.prototype.getChilds = function(e) {
	if(!this.$$$childs) this.$$$childs = [];
	return this.$$$childs;
};

Context.prototype.getParent = function(e) {
	return this.$$$parent;
};

Context.prototype.fork = function(e) {
	var child = new Context(this);
	child.$$$parent = this;
	if(!this.$$$childs) this.$$$childs = [];
	if(!this.$$$errors) this.$$$errors = [];
	child.$$$errors = this.$$$errors;
	this.$$$childs.push(child);
	return child;
};

Context.prototype.hasErrors = function(e) {
	return this.$$$errors && this.$$$errors.length > 0;
};

Context.prototype.addError = function(e) {
	if(!this.$$$errors) this.$$$errors = [];
	this.$$$errors.push(e);
};
Context.prototype.getErrors = function() {
	if(!this.$$$errors) this.$$$errors = [];
	return this.$$$errors;
};