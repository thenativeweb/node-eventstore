var async = require('async');
var options = {
    dbName: 'bencheventstore'
};

var index;

if (typeof module.exports !== 'undefined') {
    index = module.exports;
} else {
    index = root.index = {};
}

index.prepare = function(clb) {
    async.parallel([
    
        function(callback){
            require('../lib/storage/inMemory/storage').createStorage(options, function(err, storage) {
                index.inMemoryStorage = storage;
                callback(err, storage);
            });
        },
        
        function(callback){
            require('../storage/mongoDb/storage').createStorage(options, function(err, storage) {
                index.mongoDbStorage = storage;
                callback(err, storage);
            });
        },
        
        function(callback){
            require('../storage/redis/storage').createStorage(options, function(err, storage) {
                index.redisStorage = storage;
                callback(err, storage);
            });
        },
        
        function(callback){
            require('../storage/couchDb/storage').createStorage(options, function(err, storage) {
                index.couchDbStorage = storage;
                callback(err, storage);
            });
        }
        
    ],

    function(err, results){
        clb();
    });
};

index.showDefaultResult = function(suite) {
    var inMemory = null;
    var benches = [];
    for (var i in  suite) {
        if (suite[i] && suite[i].id) {
            if (suite[i].name.indexOf('inMemory') >= 0) {
                inMemory = suite[i];
            } else {
                benches.push(suite[i]);
            }
        }
    }
    benches.sort(function(a, b){
        return b.compare(a);
    });

    console.log('--- Ranking:');
    benches.forEach(function(b, index) {
        //console.log(index + 1 + '. ' + b.name + ' is ' + (Math.round((inMemory.hz / b.hz) * 100) / 100) + ' times slower than inMemoryStorage');
        console.log(index + 1 + '. ' + b.name);
    });
};