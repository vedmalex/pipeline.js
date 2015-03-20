/*! 
 * Module dependency
 */
var Stage = require('./stage').Stage;
var util = require('./util').Util;

function Empty() {
	Stage.apply(this);
}
/*!
 * Inherited from Stage
 */
util.inherits(Empty, Stage);

Empty.prototype.execute = function(ctx, callback){
	callback(null, ctx);
};

exports.Empty = Empty;