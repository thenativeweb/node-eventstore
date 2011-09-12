

var EventStream = function(store, events) {
        this.store = store;
        this.events = events !== null ? events : [];
        this.uncommittedEvents = [];
};

EventStream.prototype.commit = function() {
    store.commit(this.uncommittedEvents);
};


module.exports = EventStream;