THIS.exec = function (err, _context, callback){
debugger;
var self = this;
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
				<#
					switch (context.self.run.length) {
						case 0:#>
					if(err) return handleError(err);
					var failed = false;
					try{
						self.run.apply(context);
					} catch (err) {
						var failed = true;
						handleError(err);
					}
					if (!failed) {
						doneIt();
					}
						<#break;
						case 1:#>
					if(err) return handleError(err);
					var failed = false;
					try{
						self.run(context);
					} catch (err) {
						failed = true;
						handleError(err);
					}
					if (!failed) {
						doneIt();
					}
						<#break;
						case 2:#>
					if(err) return handleError(err);
					try{
						self.run(context, doneIt);
					} catch (err) {
						handleError(err);
					}
							<#break;
						case 3:#>
					try{
						self.run(err, context, doneIt);
					} catch (err) {
						handleError(err);
					}
							<#break;
						default:#>
					handleError(new Error('unacceptable signature'));
					<#}#>
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
