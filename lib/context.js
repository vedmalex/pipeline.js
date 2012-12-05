function Context() {
	this.errors = [];
}
exports.Context = Context;

Context.prototype.addError = function(e) {
	this.errors.push(e);
};
Context.prototype.getErrors = function() {
	return this.errors;
};

Context.prototype.init = function() {};