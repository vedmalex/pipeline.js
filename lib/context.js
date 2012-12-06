function Context(_config) {
	if(_config){
		var config = JSON.parse(JSON.stringify(_config));
		for(var prop in config){
			if(prop !== 'errors' && prop !== 'hasErrors' && prop !== 'addError' && prop !== 'getErrors'){
				this[prop] = config[prop];
			}
		}
	}
	this.errors = [];
}
exports.Context = Context;

Context.prototype.hasErrors = function(e) {
	return this.errors.length > 0;
};

Context.prototype.addError = function(e) {
	this.errors.push(e);
};
Context.prototype.getErrors = function() {
	return this.errors;
};