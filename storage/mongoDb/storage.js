//     storage.js v0.4.0
//     (c) 2012 Kaba AG, MIC AWM; under MIT License
//     (by) Jan Muehlemann (jamuhl)
//        , Adriano Raiano (adrai)

// The storage is the database driver for mongoDb.
//
// __Example:__
//
//      require('[pathToStorage]/storage').createStorage({}, function(err, storage) {
//          ...
//      });

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

mongoDbStorage.VERSION = '0.3.0';

// Create new instance of storage.
mongoDbStorage.createStorage = function(options, callback) {
    new Storage(options, callback);
};


// ## MongoDb storage
Storage = function(options, callback) {

    this.filename = __filename;

    if (typeof options === 'function')
        callback = options;
        
    var defaults = {
        host: 'localhost',
        port: 27017,
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

    // __addEvents:__ saves all events.
    //
    // `storage.addEvents(events, callback)`
    //
    // - __events:__ the events array
    // - __callback:__ `function(err){}`
    addEvents: function(events, callback) {
        for(var i in events) {
            events[i]._id = events[i].commitId;
        }
        this.events.insert(events, {keepGoing: true}, callback);
    },

    // __addSnapshot:__ stores the snapshot
    // 
    // `storage.addSnapshot(snapshot, callback)`
    //
    // - __snapshot:__ the snaphot to store
    // - __callback:__ `function(err){}` [optional]
    addSnapshot: function(snapshot, callback) {
        snapshot._id = snapshot.snapshotId;
        this.snapshots.insert(snapshot, callback);
    },

    // __getEvents:__ loads the events from _minRev_ to _maxRev_.
    // 
    // `storage.getEvents(streamId, minRev, maxRev, callback)`
    //
    // - __streamId:__ id for requested stream
    // - __minRev:__ revision startpoint
    // - __maxRev:__ revision endpoint (hint: -1 = to end) [optional]
    // - __callback:__ `function(err, snapshot, eventStream){}`
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

    // __getAllEvents:__ loads the events.
    //
    // __warning:__ don't use this in production!!!
    // 
    // `storage.getAllEvents(callback)`
    //
    // - __callback:__ `function(err, events){}`
    getAllEvents: function(callback) {
        this.events.find({}, {sort:[['commitStamp','asc']]}).toArray(callback);
    },

    // __getLastEventOfStream:__ loads the last event from the given stream in storage.
    // 
    // `storage.getLastEventOfStream(streamId, callback)`
    //
    // - __streamId:__ the stream id
    // - __callback:__ `function(err, event){}`
    getLastEventOfStream: function(streamId, callback) {
        
        var findStatement = {
            'streamId' : streamId
        };
        
        this.events.find(findStatement, {sort:[['streamRevision','desc']]}).nextObject(callback);

    },

    // __getEventRange:__ loads the range of events from given storage.
    // 
    // `storage.getEventRange(index, amount, callback)`
    //
    // - __index:__ entry index
    // - __amount:__ amount of events
    // - __callback:__ `function(err, events){}`
    getEventRange: function(index, amount, callback) {
        this.events.find({}, {sort:[['commitStamp','asc']], skip: index, limit: amount}).toArray(callback);
    },

    // __getSnapshot:__ loads the next snapshot back from given max revision or the latest if you 
    // don't pass in a _maxRev_.
    // 
    // `storage.getSnapshot(streamId, maxRev, callback)`
    //
    // - __streamId:__ id for requested stream
    // - __maxRev:__ revision endpoint (hint: -1 = to end)
    // - __callback:__ `function(err, snapshot){}`
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

    // __getUndispatchedEvents:__ loads all undispatched events.
    //
    // `storage.getUndispatchedEvents(callback)`
    //
    // - __callback:__ `function(err, events){}`
    getUndispatchedEvents: function(callback) {
        this.events.find({'dispatched' : false}, {sort:[['streamId','asc'], ['streamRevision','asc']]}).toArray(callback);
    },

    // __setEventToDispatched:__ sets the given event to dispatched.
    //
    // __hint:__ instead of the whole event object you can pass: {_id: 'commitId'}
    //
    // `storage.setEventToDispatched(event, callback)`
    //
    // - __event:__ the event
    // - __callback:__ `function(err, events){}` [optional]
    setEventToDispatched: function(event, callback) {
        var updateCommand = { '$set' : {'dispatched': true} };
        this.events.update({'_id' : event._id}, updateCommand, callback);
    },

    // __getId:__ loads a new id from storage.
    //
    // `storage.getId(callback)`
    //
    // - __callback:__ `function(err, id){}`
    getId: function(callback) {
        callback(null, new ObjectID().toString());
    }
};

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
