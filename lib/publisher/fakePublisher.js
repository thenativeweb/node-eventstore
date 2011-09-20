var uuid = require('./uuid');


var root = this;

var FakePublisher;

if (typeof exports !== 'undefined') {
    FakePublisher = exports;
} else {
    FakePublisher = root.FakePublisher = {};
}

FakePublisher.VERSION = '0.0.1';

// create new instance of storage
FakePublisher.createPublisher = function(options) {
    return new Publisher(options);
};

/*******************************************
* Storage 
*/
var Publisher = function(options) {
    this.published = [];
    this.subscriptions = [];
};

Publisher.prototype.subscribe = function(callback) {
    this.subscriptions.push({callback: callback});
};

Publisher.prototype.publish = function(event) {    
    for (var subscriber in this.subscriptions) {
        subscriber.callback(event);
    }
    
    this.published.push(evemt);
};

