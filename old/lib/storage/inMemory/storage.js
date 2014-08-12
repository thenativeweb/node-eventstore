//     lib/storage/inMemory/storage.js v0.4.0
//     (c)(by) Jan Muehlemann (jamuhl)
//        , Adriano Raiano (adrai)

// An __inMemory__ implemetation for storage. __Use only for development purpose.__   
// For production there is a wide range of options (mongoDb, redis, couchDb) or role your own implementation.
var uuid = require('node-uuid').v4
  , root = this
  , inMemoryStorage
  , Storage;

if (typeof exports !== 'undefined') {
  inMemoryStorage = exports;
} else {
  inMemoryStorage = root.inMemoryStorage = {};
}

inMemoryStorage.VERSION = '0.5.0';

// Create new instance of storage.
inMemoryStorage.createStorage = function (options, callback) {
  return new Storage(options, callback);
};

// ## inMemory storage
Storage = function (options, callback) {

  this.filename = __filename;
  this.isConnected = false;

  if (typeof options === 'function')
    callback = options;

  this.options = options;

  this.store = {};
  this.snapshots = {};

  if (callback) {
    this.connect(callback);
  }
};

Storage.prototype = {

  // __connect:__ connects the underlaying database.
  //
  // `storage.connect(callback)`
  //
  // - __callback:__ `function(err, storage){}`
  connect: function (callback) {
    this.isConnected = true;

    if (callback) callback(null, this);
  },

  // __addEvents:__ saves all events.
  //
  // `storage.addEvents(events, callback)`
  //
  // - __events:__ the events array
  // - __callback:__ `function(err){}`
  addEvents: function (events, callback) {
    if (!events || events.length === 0) {
      callback(null);
      return;
    }

    var aggregateId = events[0].aggregateId;
    var aggregate = events[0].aggregate || '_general';
    var context = events[0].context || '_general';

    this.store[context] = this.store[context] || {};
    this.store[context][aggregate] = this.store[context][aggregate] || {};

    this.store[context][aggregate][aggregateId] = this.store[context][aggregate][aggregateId] || [];

    this.store[context][aggregate][aggregateId] = this.store[context][aggregate][aggregateId].concat(events);
    callback(null);
  },

  // __addSnapshot:__ stores the snapshot
  // 
  // `storage.addSnapshot(snapshot, callback)`
  //
  // - __snapshot:__ the snaphot to store
  // - __callback:__ `function(err){}` [optional]
  addSnapshot: function (snapshot, callback) {
    var aggregateId = snapshot.aggregateId;
    var aggregate = snapshot.aggregate || '_general';
    var context = snapshot.context || '_general';

    this.snapshots[context] = this.snapshots[context] || {};
    this.snapshots[context][aggregate] = this.snapshots[context][aggregate] || {};

    this.snapshots[context][aggregate][snapshot.aggregateId] = this.snapshots[context][aggregate][snapshot.aggregateId] || [];

    this.snapshots[context][aggregate][snapshot.aggregateId].push(snapshot);
    callback(null);
  },

  // __getEvents:__ loads the events from _minRev_ to _maxRev_.
  // 
  // `storage.getEvents(streamId, minRev, maxRev, callback)`
  //
  // - __streamId:__ id for requested stream
  // - __minRev:__ revision startpoint
  // - __maxRev:__ revision endpoint (hint: -1 = to end) [optional]
  // - __callback:__ `function(err, events){}`
  getEvents: function (streamId, minRev, maxRev, callback) {

    if (typeof maxRev === 'function') {
      callback = maxRev;
      maxRev = -1;
    }

    var query = streamId;

    if (typeof query === 'string') {
      query = { aggregateId: streamId };
    }

    var res = [];
    
    if (query.context && query.aggregate) {
      this.store[query.context] = this.store[query.context] || {};
      this.store[query.context][query.aggregate] = this.store[query.context][query.aggregate] || {};
      
      if (!this.store[query.context][query.aggregate][query.aggregateId]) {
        return callback(null, res);
      }
      else {
        if (maxRev === -1) {
          res = res.concat(this.store[query.context][query.aggregate][query.aggregateId].slice(minRev));
        }
        else {
          res = res.concat(this.store[query.context][query.aggregate][query.aggregateId].slice(minRev, maxRev));
        }
      }
      return callback(null, res);;
    }

    if (!query.context && query.aggregate) {
      for (var s in this.store) {
        var c = this.store[s];
        if (c[query.aggregate] && c[query.aggregate][query.aggregateId]) {
          if (maxRev === -1) {
            res = res.concat(c[query.aggregate][query.aggregateId].slice(minRev));
          }
          else {
            res = res.concat(c[query.aggregate][query.aggregateId].slice(minRev, maxRev));
          }
        }
      }
      return callback(null, res);
    }

    if (query.context && !query.aggregate) {
      var c = this.store[query.context] || {};
      for (var ss in c) {
        var a = c[ss];
        if (a[query.aggregateId]) {
          if (maxRev === -1) {
            res = res.concat(a[query.aggregateId].slice(minRev));
          }
          else {
            res = res.concat(a[query.aggregateId].slice(minRev, maxRev));
          }
        }
      }
      return callback(null, res);
    }

    if (!query.context && !query.aggregate) {
      for (var sc in this.store) {
        var cont = this.store[sc];
        for (var sa in cont) {
          var agg = cont[sa];
          if (agg[query.aggregateId]) {
            if (maxRev === -1) {
              res = res.concat(agg[query.aggregateId].slice(minRev));
            }
            else {
              res = res.concat(agg[query.aggregateId].slice(minRev, maxRev));
            }
          }
        }
      }
      return callback(null, res);
    }
  },

  // __getEvents:__ loads the events from _minRev_ to _maxRev_.
  // 
  // `storage.getAllEvents(from, amount, callback)`
  //
  // - __from:__ from entry index [optional, default 0]
  // - __amount:__ amount of results (hint: -1 = to end) [optional]
  // - __callback:__ `function(err, events){}`
  getAllEvents: function (from, amount, callback) {

    if (typeof amount === 'function') {
      callback = amount;
      amount = -1;
    }

    if (typeof from === 'function') {
      callback = from;
      from = 0;
      amount = -1;
    }

    if (!this.store) {
      callback(null, []);
    }
    else {
      var res = [];
      for (var s in this.store) {
        for (var ss in this.store[s]) {
          for (var sss in this.store[s][ss]) {
            res = res.concat(this.store[s][ss][sss]);
          }
        }
      }
      if (amount === -1) {
        callback(null, res.slice(from));
      }
      else {
        callback(null, res.slice(from, from + amount));
      }
    }
  },

  // __getSnapshot:__ loads the next snapshot back from given max revision or the latest if you 
  // don't pass in a _maxRev_.
  // 
  // `storage.getSnapshot(streamId, maxRev, callback)`
  //
  // - __streamId:__ id for requested stream
  // - __maxRev:__ revision endpoint (hint: -1 = to end)
  // - __callback:__ `function(err, snapshot){}`
  getSnapshot: function (streamId, maxRev, callback) {

    if (typeof maxRev === 'function') {
      callback = maxRev;
      maxRev = -1;
    }

    var query = streamId;

    if (typeof query === 'string') {
      query = { aggregateId: streamId };
    }
    
    var res = null;

    if (query.context && query.aggregate) {
      this.snapshots[query.context] = this.snapshots[query.context] || {};
      this.snapshots[query.context][query.aggregate] = this.snapshots[query.context][query.aggregate] || {};

      if (!this.snapshots[query.context][query.aggregate][query.aggregateId]) {
        return callback(null, res);
      }
      else {
        if (maxRev === -1) {
          res = this.snapshots[query.context][query.aggregate][query.aggregateId][this.snapshots[query.context][query.aggregate][query.aggregateId].length - 1]
        }
        else {
          var snaps = this.snapshots[query.context][query.aggregate][query.aggregateId];
          for (var i = snaps.length - 1; i >= 0; i--) {
            if (snaps[i].revision <= maxRev) {
              callback(null, snaps[i]);
              return;
            }
          }
        }
      }
      return callback(null, res);
    }

    if (!query.context && query.aggregate) {
      for (var s in this.snapshots) {
        var c = this.snapshots[s];
        if (c[query.aggregate] && c[query.aggregate][query.aggregateId]) {
          if (maxRev === -1) {
            res = c[query.aggregate][query.aggregateId][c[query.aggregate][query.aggregateId].length - 1]
          }
          else {
            var snaps = c[query.aggregate][query.aggregateId];
            for (var i = snaps.length - 1; i >= 0; i--) {
              if (snaps[i].revision <= maxRev) {
                callback(null, snaps[i]);
                return;
              }
            }
          }
        }
      }
      return callback(null, res);
    }

    if (query.context && !query.aggregate) {
      var c = this.snapshots[query.context] || {};
      for (var ss in c) {
        var a = c[ss];
        if (a[query.aggregateId]) {
          if (maxRev === -1) {
            res = a[query.aggregateId][a[query.aggregateId].length - 1]
          }
          else {
            var snaps = a[query.aggregateId];
            for (var i = snaps.length - 1; i >= 0; i--) {
              if (snaps[i].revision <= maxRev) {
                callback(null, snaps[i]);
                return;
              }
            }
          }
        }
      }
      return callback(null, res);
    }

    if (!query.context && !query.aggregate) {
      for (var sc in this.snapshots) {
        var cont = this.snapshots[sc];
        for (var sa in cont) {
          var agg = cont[sa];
          if (agg[query.aggregateId]) {
            if (maxRev === -1) {
              res = agg[query.aggregateId][agg[query.aggregateId].length - 1]
            }
            else {
              var snaps = agg[query.aggregateId];
              for (var i = snaps.length - 1; i >= 0; i--) {
                if (snaps[i].revision <= maxRev) {
                  callback(null, snaps[i]);
                  return;
                }
              }
            }
          }
        }
      }
      return callback(null, res);
    }
  },

  // __getUndispatchedEvents:__ loads all undispatched events.
  //
  // `storage.getUndispatchedEvents(callback)`
  //
  // - __callback:__ `function(err, events){}`
  getUndispatchedEvents: function (callback) {
    var array = [];

    this.getAllEvents(function (err, evts) {
      for (var ele in evts) {
        var evt = evts[ele];
        if (evt.dispatched === false) {
          array.push(evt);
        }
      }
    });

    callback(null, array);
  },

  // __setEventToDispatched:__ sets the given event to dispatched.
  //
  // __hint:__ instead of the whole event object you can pass: {_id: 'commitId'}
  //
  // `storage.setEventToDispatched(event, callback)`
  //
  // - __event:__ the event
  // - __callback:__ `function(err, events){}` [optional]
  setEventToDispatched: function (evt, callback) {
    evt.dispatched = true;
    callback(null);
  },

  // __getId:__ loads a new id from storage.
  //
  // `storage.getId(callback)`
  //
  // - __callback:__ `function(err, id){}`
  getId: function (callback) {
    callback(null, uuid().toString());
  }
};
