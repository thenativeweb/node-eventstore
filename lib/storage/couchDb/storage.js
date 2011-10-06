var cradle = require('cradle');

var root = this;

var CouchDbStorage;

if (typeof exports !== 'undefined') {
    CouchDbStorage = exports;
} else {
    CouchDbStorage = root.CouchDbStorage = {};
}

CouchDbStorage.VERSION = '0.0.1';

// create new instance of storage
CouchDbStorage.createStorage = function(options) {
    return new Storage(options);
};

/*******************************************
* Storage 
*/
var Storage = function(options) {
    // set options and load defaults if needed
    this.options = options || {};
    this.options.host = this.options.host || 'localhost';
    this.options.port = this.options.port || 5984;
    
    cradle.setup({host: this.options.host,
                  port: this.options.port,
                  options: {cache: true, raw: false}});
    
    this.collectionName = 'events';
    
    this.store = new(cradle.Connection)();
    
    this.client = this.store.database(this.collectionName);
    this.client.exists(function(err, res) {
        if (!res) {
            this.client.create(function(err) {
                if (err) {
                    console.log('err: '+JSON.stringify(err));
                }
                else {
                    this.client.save('_design/'+this.collectionName, {
                        allUndispatched: {
                            map: function (evt) {
                                if (evt.dispatched === false) {
                                    emit(null, evt);
                                }
                            }
                        }
                    });
                }
            }.bind(this));
        }
    }.bind(this));
};

Storage.prototype.addEvent = function(event, clb) {
    event.dispatched = false;
    this.client.save(event.commitId, event, function(err, res) {
        if (err) {
            console.log('Error: '+JSON.stringify(err));
        }
        else {
            clb();
        }
    });
};

Storage.prototype.getEvents = function(streamId, minRev, maxRev) {
    this.client.save('_design/'+this.collectionName, {
        rev: {
            map: function (evt) {
                if (evt.streamId === streamId &&
                    evt.streamRevision > minRev) {
                        if (maxRev == -1 || evt.streamRevision <= maxRev) {
                            emit(evt._id, evt);
                        }
                }
            }
        }
    }, function() {
        this.client.view(this.collectionName+'/rev', function(err) {
            if (err) {
                console.log('err: '+JSON.stringify(err));
            }
            else {
                this.client.view(this.collectionName+'/rev',
                    function(err, events) {
                        if(!err) {
                            if (events.length === 0) {
                                return undefined;
                            } else {
                                return events;
                            }
                        }
                    }
                );
            }
        }.bind(this));
    }.bind(this));
};

Storage.prototype.getUndispatchedEvents = function() {
    this.client.view(this.collectionName+'/allUndispatched', function(err, res) {
        var result = [];
        for (var i in res) {
            result.push(res[i].value);
        }
        callback(result);
    });
};

Storage.prototype.setEventToDispatched = function(evt) {
    this.client.merge(id, {'dispatched': true}, function(err, res) {
        if (err) {
            console.log('Error: '+JSON.stringify(err));
        }
    });
};

Storage.prototype.getId = function(callback) {
    this.store.uuids(function(err, uuids) {
        if (!err) {
            if (typeof callback === 'function') {
                callback(uuids);
            }
        }
    });
};
