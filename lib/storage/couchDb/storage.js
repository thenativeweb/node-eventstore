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
CouchDbStorage.createStorage = function(options, callback) {
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
    this.options.port = this.options.port || 5984;
    
    this.logger = this.options.logger || null;
    
    cradle.setup({host: this.options.host,
                  port: this.options.port,
                  options: {cache: true, raw: false}});
    
    this.collectionName = 'events';
    
    this.store = new(cradle.Connection)();
    
    this.client = this.store.database(this.collectionName);
    this.client.exists(function(err, res) {
		if (err) {
			if (this.logger) {
				this.logger.error(JSON.stringify(err));
			}
		}
		else if (!res) {
            this.client.create(function(err) {
                if (err) {
                    if (this.logger) {
						this.logger.error(JSON.stringify(err));
					}
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
        callback(this);
    }.bind(this));
};

Storage.prototype.addEvent = function(event, clb) {
	var logger = this.logger;
    this.client.save(event.commitId, event, function(err, res) {
        if (err) {
			if (logger) {
				logger.error(JSON.stringify(err));
			}
        }
        else {
            clb();
        }
    });
};

Storage.prototype.getEvents = function(streamId, minRev, maxRev, callback) {
	var logger = this.logger;
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
                if (logger) {
					logger.error(JSON.stringify(err));
				}
            }
            else {
                this.client.view(this.collectionName+'/rev',
                    function(err, events) {
                        if(!err) {
                            if (events.length === 0) {
                                callback([]);
                            } else {
                                callback(events);
                            }
                        }
                        else {
							if (logger) {
								logger.error(JSON.stringify(err));
							}
						}
                    }
                );
            }
        }.bind(this));
    }.bind(this));
};

Storage.prototype.getUndispatchedEvents = function(callback) {
	var logger = this.logger;
    this.client.view(this.collectionName+'/allUndispatched', function(err, res) {
		if (err) {
			if (logger) {
				logger.error(JSON.stringify(err));
			}
		}
		else {
			var result = [];
			for (var i in res) {
				result.push(res[i].value);
			}
			callback(result);
		}
    });
};

Storage.prototype.setEventToDispatched = function(evt) {
	var logger = this.logger;
    this.client.merge(evt.commitId, {'dispatched': true}, function(err, res) {
        if (err) {
            if (logger) {
				logger.error(JSON.stringify(err));
			}
        }
    });
};

Storage.prototype.getId = function(callback) {
	var logger = this.logger;
    this.store.uuids(function(err, uuids) {
        if (err) {
			if (logger) {
				logger.error(JSON.stringify(err));
			}
		}
		else {
            if (typeof callback === 'function') {
                callback(uuids.toString());
            }
        }
    });
};
