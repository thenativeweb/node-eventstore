var mongo = require('mongodb')
  , ObjectID = mongo.BSONPure.ObjectID
  , root = this
  , mongoDbStorage
  , Storage;

if (typeof exports !== 'undefined') {
    mongoDbStorage = exports;
} else {
    mongoDbStorage = root.mongoDbStorage = {};
}

mongoDbStorage.VERSION = '0.0.1';

// Create new instance of storage.
mongoDbStorage.createStorage = function(options, callback) {
    new Storage(options, callback);
};


/*******************************************
* Storage 
*/
Storage = function(options, callback) {
    if (typeof options === 'function')
        callback = options;
        
    var defaults = {
        host: 'localhost',
        port: mongo.Connection.DEFAULT_PORT,
        dbName: 'eventstore',
        eventsCollectionName: 'events',
        snapshotsCollectionName: 'snapshots'
    };
    
    this.options = mergeOptions(options, defaults);
    
    var server = new mongo.Server(this.options.host, this.options.port, {});
    new mongo.Db(this.options.dbName , server, {}).open(function(err, client) {
        if (err) {
            callback(err);
        } else {
            this.client = client;
            
            this.events = new mongo.Collection(client, this.options.eventsCollectionName);
            this.snapshots = new mongo.Collection(client, this.options.snapshotsCollectionName);

            callback(null, this);
        }        
    }.bind(this));
};

Storage.prototype = {

    // This function saves an event in the storage.
    addEvents: function(events, callback) {
        for(var i in events) {
            events[i]._id = events[i].commitId;
        }
        this.events.insertAll(events, {keepGoing: true}, callback);
    },

    // This function saves a snapshot in the storage.
    addSnapshot: function(snapshot, callback) {
        snapshot._id = snapshot.snapshotId;
        this.snapshots.insert(snapshot, callback);
    },

    // This function returns the wished events.
    getEvents: function(streamId, minRev, maxRev, callback) {
        
        if (typeof maxRev === 'function') {
            callback = maxRev;
            maxRev = -1;
        }
        
        var options = {'$gte':minRev, '$lt':maxRev};
        if (maxRev == -1) options = {'$gte':minRev};
                    
        var findStatement = {
            'streamId' : streamId,
            'streamRevision': options
        };
        
        this.events.find(findStatement, {sort:[['streamRevision','asc']]}).toArray(callback);
    },

    // This function returns all events.
    getAllEvents: function(callback) {
        this.events.find({}, {sort:[['commitStamp','asc']]}).toArray(callback);
    },

    // This function returns the wished snapshot.
    // If revMax is -1 returns the latest snapshot.
    getSnapshot: function(streamId, maxRev, callback) {

        if (typeof maxRev === 'function') {
            callback = maxRev;
            maxRev = -1;
        }

        var findStatement = {'streamId' : streamId};
        if (maxRev > -1) findStatement = { 'streamId' : streamId, 'revision': {'$lte':maxRev} };
        
        this.snapshots.find(findStatement, {sort:[['revision','desc']], limit: 1}).toArray(function(err, snapshots) {
            if (err) {
                callback(err);
            } else {
                snapshots.length > 0 ? callback(null, snapshots[0]) : callback(null, {});
            }
        });
    },

    // This function returns all undispatched events.
    getUndispatchedEvents: function(callback) {
        this.events.find({'dispatched' : false}, {sort:[['streamRevision','asc']]}).toArray(callback);
    },

    // This function set an event to dispatched.
    setEventToDispatched: function(event, callback) {
        var updateCommand = { '$set' : {'dispatched': true} };
        this.events.update({'_id' : event._id}, updateCommand, callback);
    },

    // This function returns a new id.
    getId: function(callback) {
        callback(null, new ObjectID().toString());
    }
}

// helper
var mergeOptions = function(options, defaultOptions) {
    if (!options || typeof options === 'function') {
        return defaultOptions;
    }
    
    var merged = {};
    for (var attrname in defaultOptions) { merged[attrname] = defaultOptions[attrname]; }
    for (var attrname in options) { if (options[attrname]) merged[attrname] = options[attrname]; }
    return merged;  
};
