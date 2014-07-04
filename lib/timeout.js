/*!
 * Module dependency
 */

var Stage = require('./stage').Stage;
var util = require('./util').Util;
//
// timeout - ms
// original
// overdue - optional
//
function Timeout(config) {
	
	var self = this;
	
	if (!(self instanceof Timeout)) {
		throw new Error('constructor is not a function');
	}

	if (config && config.run instanceof Function) {
		config.stage = new Stage(config.run);
		delete config.run;
	}

	Stage.apply(self, arguments);
	
	if (!config) {
		config = {};
	}

	self.timeout = config.timeout || 1000;

	if (config.stage instanceof Stage) {
		self.stage = config.stage;
	} else if (config.stage instanceof Function) {
		self.stage = new Stage(config.stage);
	} else {
		self.stage = new Stage();
	}

	if (config.overdue instanceof Stage) {
		self.overdue = config.overdue;
	} else if (config.overdue instanceof Function) {
		self.overdue = new Stage(config.overdue);
	} else self.overdue = new Stage(function(err, ctx, done) {
		done(new Error('overdue'));
	});

	self.name = config.name;
}

util.inherits(Timeout, Stage);

Timeout.prototype.timeout = undefined;
Timeout.prototype.stage = undefined;
Timeout.prototype.overdue = undefined;

Timeout.prototype.reportName = function() {
	return "Timeout:" + this.name;
};

Timeout.prototype.compile = function() {
	
	var self = this;
	
	if (!self.name) {
		self.name = "success: " + self.stage.reportName() + " failure: " + self.overdue.reportName();
	}
	
	var run = function(err, ctx, done) {
		process.nextTick(function() {
			var to;
			var localDone = function(err) {
				
				if (to) {
					clearTimeout(to);
					to = null;
					done(err);
				}
			};
			
			if (!err) {
				to = setTimeout(function() {
					if (to) {
						self.overdue.execute(ctx, localDone);
					}
				}, self.timeout);
				self.stage.execute(ctx, localDone);
			} else {
				done(err);
			}
		});
	};
	self.run = run;
};

Timeout.prototype.execute = function(context, callback) {
	var self = this;
	if (!self.run) {
		self.compile();
	}
	Timeout.super_.prototype.execute.apply(self, arguments);
};

exports.Timeout = Timeout;