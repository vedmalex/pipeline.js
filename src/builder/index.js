// classes
exports.fStage = require('./stage').fStage;
exports.fPipeline = require('./pipeline').fPipeline;
exports.fSequential = require('./sequential').fSequential;
exports.fIfElse = require('./ifelse').fIfElse;
exports.fMultiWaySwitch = require('./multywayswitch').fMultiWaySwitch;
exports.fCase = require('./multywayswitch').fCase;
exports.fParallel = require('./parallel').fParallel;
exports.fTimeout = require('./timeout').fTimeout;
exports.fWrap = require('./wrap').fWrap;
exports.fRetryOnError = require('./retryonerror').fRetryOnError;
exports.fDoWhile = require('./dowhile').fDoWhile;

//fluent functions

exports.Stage = require('./stage').Stage;
exports.Pipeline = require('./pipeline').Pipeline;
exports.Pipe = exports.Pipeline;
exports.Parallel = require('./parallel').Parallel;
exports.Sequential = require('./sequential').Sequential;
exports.RetryOnError = require('./retryonerror').RetryOnError;
exports.Timeout = require('./timeout').Timeout;
exports.Wrap = require('./wrap').Wrap;
exports.DoWhile = require('./dowhile').DoWhile;
exports.If = require('./ifelse').If;
exports.MWS = require('./multywayswitch').MWS;
exports.MWCase = require('./multywayswitch').MWCase;


// методы расширения типа
// build -- создает реальные объекты, compose -- не создает, 
// а просто строить hash POJsO который можно позже забилдить
// должны приниматься любые наследники от Base в качестве Stage...
// так веселее
// поля всех классов сделать prototype

/*
Stage(fn).inParallelWith(Stage())
запутанно будет!!!
*/