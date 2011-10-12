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
    this.collectionName = this.options.collectionName || 'events';
    
    cradle.setup({host: this.options.host,
                  port: this.options.port,
                  options: {cache: true, raw: false}});
    
    this.store = new(cradle.Connection)();
    
    this.client = this.store.database(this.collectionName);
    this.client.exists(function(err, res) {
		if (err) {
			if (this.logger) {
				this.logger.error(JSON.stringify(err));
			}
		}
		else if (res === false) {
            this.client.create(function(err) {
                if (err) {
                    if (this.logger) {
						this.logger.error(JSON.stringify(err));
					}
                }
                else {
                    this.client.save('_design/'+this.collectionName, {
                        byStreamId: {
                            map: function (evt) {
                                emit(evt.streamId, evt);
                            }
                        },
                        allUndispatched: {
                            map: function (evt) {
                                if (evt.dispatched === false) {
                                    emit(evt._id, evt);
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

Storage.prototype._clear = function(clb) {
    var logger = this.logger;
    var client = this.client;
    client.all(function(err, doc) {
        if (err) {
            if (logger) {
				logger.error(JSON.stringify(err));
			}
            clb();
        }
        else {
            for(var i = 0; i < doc.length; i++) {
                /* Don't delete design documents. */
                if(doc[i].id.indexOf("_design") == -1) {
                    client.remove(doc[i].id, doc[i].value.rev, function(err, doc) {
                        if (err) {
                            if (logger) {
                                logger.error(JSON.stringify(err));
                            }
                        }
                    });
                }
                if (i === doc.length-1) {
                    clb();
                }
            }
        }
    });
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
    this.client.view(this.collectionName+'/byStreamId', { 'key': streamId }, 
        function(err, events) {
            if(!err) {
                if (events.length === 0) {
                    callback([]);
                } else {
                    if (maxRev === -1) {
                        callback(events.slice(minRev));
                    }
                    else {
                        callback(events.slice(minRev, maxRev));
                    }
                }
            }
            else {
				if (logger) {
					logger.error(JSON.stringify(err));
				}
			}
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
