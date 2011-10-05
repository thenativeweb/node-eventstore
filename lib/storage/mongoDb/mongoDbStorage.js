var mongo = require('mongodb')
  , ObjectID = mongo.BSONPure.ObjectID;

var root = this;

var MongoDbStorage;

if (typeof exports !== 'undefined') {
    MongoDbStorage = exports;
} else {
    MongoDbStorage = root.MongoDbStorage = {};
}

MongoDbStorage.VERSION = '0.0.1';

// create new instance of storage
MongoDbStorage.createStorage = function(options) {
    return new Storage(options);
};

/*******************************************
* Storage 
*/
var Storage = function(options) {
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
    }.bind(this));
    
};

Storage.prototype.addEvent = function(event) {
    this.client.collection(this.collectionName, function(err, collection) {
        event._id = event.commitId;
        collection.insert(event, function(err, doc) {
            if (err) {
                console.log('Error: '+err);
            }
        });
    });
};

Storage.prototype.getEvents = function(streamId, minRev, maxRev) {
    this.client.collection(this.collectionName, function(err, collection) {
        var options = {'$gt':minRev, '$lte':maxRev};
        if (maxRev == -1) {
            options = {'$gt':minRev};
        }
        collection.find({'streamId' : streamId, 'streamRevision': options}, {sort:[['streamRevision','desc']]}, function(err, cursor) {
            cursor.toArray(function(err, events) {
                if (events.length === 0) {
                    return undefined;
                } else {
                    return events;
                }
            });
        });
    });
};

Storage.prototype.getUndispatchedEvents = function() {
    var array = [];
    
    for (var ele in this.store) {
        for (var evt in ele) {
            if (!evt.dispatched) {
                array.push(evt);
            }
        }
    }
    
    array.sort(function(a,b) {
        if (a.commitStamp > b.commitStamp) return 1;
        if (a.commitStamp < b.commitStamp) return -1;
        return 0;
    });
    
    return array;
};

Storage.prototype.setEventToDispatched = function(evt) {
    evt.dispatched = true;
};

Storage.prototype.getId = function(callback) {
    if (typeof callback === 'function') {
        callback(new ObjectID());
    }
};
