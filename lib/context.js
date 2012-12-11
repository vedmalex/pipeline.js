function Context(_config) {
	if(_config){
		var config = JSON.parse(JSON.stringify(_config));
		for(var prop in config){
			if(prop !== '$$$errors' && prop !== 'hasErrors' && prop !== 'addError' && prop !== 'getErrors' && prop !== 'getChilds' && prop !== 'getParent' && prop !== '$$$childs' && prop !== '$$$parent'){
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