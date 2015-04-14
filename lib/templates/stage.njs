this.exec = function (err, _context, callback){
debugger;
var self = this;
		if (_context instanceof Function) {
			callback = _context;
			_context = err;
			err = undefined;
		} else if (!_context && !(err instanceof Error)) {
			_context = err;
			err = undefined;
			callback = undefined;
		}
<#	if('function' === typeof context.self.run) {#>

		var context = Context.ensure(_context);
		var hasCallback = typeof(callback) === 'function';

		function handleError(_err) {
			if (_err && !(_err instanceof Error)) {
				if ('string' === typeof _err)
					_err = Error(_err);
			}
<#
			var len = context.self.rescue ? context.self.rescue.length : -1;
			switch (len) {
				case 0: #>
					finishIt(self.rescue());
<#					break;

				case 1:#>
					finishIt(self.rescue(_err));
<#					break;

				case 2:#>
					finishIt(self.rescue(_err, context));
<#					break;

				case 3:#>
					self.rescue(_err, context, finishIt);
<#					break;

				default:#>
					finishIt(_err);
<#			}#>
		}

		function finishIt(err) {
			if (hasCallback) {
				callback(err, context);
			}
		}

		//wrap it with errorcheck
		var doneIt = function(err) {
			if (err) {
				handleError(err);
			} else {
				finishIt();
			}
		};

		runStage = function(err) {
				if (err) {
					<#if (context.self.run.length == 3) {#>
					var ensureAsync = fpAsyncCall.bind(undefined, handleError);
						ensureAsync(self, self.run)(err, context, doneIt);
					<#} else {#>
						handleError(err);
					<#}#>
				} else {<#
					switch (context.self.run.length) {
						case 0:#>
					var ensureSync = fpSyncCall.bind(undefined, handleError);
					ensureSync(context, self.run, doneIt)();
							<#break;
						case 1:#>
					var ensureSync = fpSyncCall.bind(undefined, handleError);
					ensureSync(self, self.run, doneIt)(context);
							<#break;
						case 2:#>
					var ensureAsync = fpAsyncCall.bind(undefined, handleError);
					ensureAsync(self, self.run)(context, doneIt);
							<#break;
						case 3:#>
					var ensureAsync = fpAsyncCall.bind(undefined, handleError);
					ensureAsync(self, self.run)(null, context, doneIt);
							<#break;
						default:#>
					handleError(new Error('unacceptable signature'));
					<#}#>
				}
		};
<#
		var eLen = context.self.ensure ? context.self.ensure.length : -1;
		switch (eLen) {
			case 2:#>
				self.ensure(context, runStage);
<#				break;
			case 1:#>
				runStage(self.ensure(context));
<#				break;
			default:#>
				runStage();
<#		}#>

<#} else {#>
if(callback)
	callback(new Error(self.reportName() + ' reports: run is not a function'), _context);
<#}#>
	}
