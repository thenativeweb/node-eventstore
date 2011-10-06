var mongo = require('mongodb')
  , ObjectID = mongo.BSONPure.ObjectID
  , async = require('async');

var root = this;

var MongoDbStorage;

if (typeof exports !== 'undefined') {
    MongoDbStorage = exports;
} else {
    MongoDbStorage = root.MongoDbStorage = {};
}

MongoDbStorage.VERSION = '0.0.1';

// create new instance of storage
MongoDbStorage.createStorage = function(options, callback) {
    new Storage(options, callback);
};

/*******************************************
* Storage 
*/
var Storage = function(options, callback) {
    callback = !callback ? options : callback;
    options = callback ? options : {};
 
    // set options and load defaults if needed
    this.options = options || {};
    this.options.host = this.options.host || 'localhost';
    this.options.port = this.options.port || mongo.Connection.DEFAULT_PORT;
        
    this.collectionName = 'events';
    this.store = new mongo.Db('eventstore'
                             , new mongo.Server(this.options.host, this.options.port, {}), {});
                             
    this.store.addListener("error", function(error) {
        console.log("Error connecting to mongo -- perhaps it isn't running?");
    });
    
    this.client = undefined;
    
    this.store.open(function(err, client) {
        this.client = client;
        callback(this);
    }.bind(this));
};

Storage.prototype.addEvent = function(event, clb) {
    var client = this.client;
    var collectionName = this.collectionName;
    async.waterfall([
        function(callback){
            client.collection(collectionName, function(err, collection) {
                if (err) {
                    console.log('Error: '+err);
                }
                event._id = event.commitId;
                callback(null, collection);
            });
        },
        function(collection, callback){
            collection.insert(event, function(err, doc) {
                if (err) {
                    console.log('Error: '+err);
                }
                else {
                    clb();
                }
            });
        }
    ]);
};

Storage.prototype.getEvents = function(streamId, minRev, maxRev, callback) {
    this.client.collection(this.collectionName, function(err, collection) {
        var options = {'$gt':minRev, '$lte':maxRev};
        if (maxRev == -1) {
            options = {'$gt':minRev};
        }
        
        var findStatement = {
                                'streamId' : streamId,
                                '$or': 
                                    [
                                        {'streamRevision': options},
                                        {'streamRevision': null}
                                    ]
                            };
        collection.find(findStatement, {sort:[['streamRevision','desc']]}, function(err, cursor) {
            cursor.toArray(function(err, events) {
                if (err) {
                    console.log('Error: '+err);
                }
                else {
                    callback(events);
                }
            });
        });
    });
};

Storage.prototype.getUndispatchedEvents = function(callback) {
    this.client.collection(this.collectionName, function(err, collection) {
        collection.find({'dispatched' : false}, {sort:[['streamRevision','desc']]}, function(err, cursor) {
            cursor.toArray(function(err, events) {
                if (events.length === 0) {
                    callback([]);
                } else {
                    callback(events);
                }
            });
        });
    });
};

Storage.prototype.setEventToDispatched = function(evt) {
    this.client.collection(this.collectionName, function(err, collection) {
        var updateCommand = { '$set' : {'dispatched': true} };
        collection.update({'_id' : evt.commitId}, updateCommand, function(err, doc) {
            if (err) {
                console.log('Error: '+err);
            }
        });
    });
};

Storage.prototype.getId = function(callback) {
    if (typeof callback === 'function') {
        callback(new ObjectID().toString());
    }
};
