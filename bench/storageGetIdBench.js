var Benchmark = require('benchmark');
var suite = new Benchmark.Suite();
var util = require('./util');

util.prepare(function() {
	// add tests
	suite.add('inMemory#getId', function(deferred) {
		util.inMemoryStorage.getId(function(err, id) {
			//deferred.resolve();
		});
	}, {defer: false})
	.add('mongoDbStorage#getId', function(deferred) {
		util.mongoDbStorage.getId(function(err, id) {
			//deferred.resolve();
		});
	}, {defer: false})
	.add('redisStorage#getId', function(deferred) {
		util.redisStorage.getId(function(err, id) {
			//deferred.resolve();
		});
	}, {defer: false})
	// add listeners
	.on('cycle', function(event, bench) {
		console.log(String(bench));
	})
	.on('complete', function() {
		util.showDefaultResult(this);
	})
	// run async
	.run({ 'async': true });
});