//     lib/util.js v0.3.0
//     (c) 2012 Kaba AG, MIC AWM; under MIT License
//     (by) Jan Muehlemann (jamuhl)
//        , Adriano Raiano (adrai)

// Util module     

var root = this;

require('./json');

var util;

if (typeof exports !== 'undefined') {
    util = exports;
} else {
    util = root.eventStore.util = {};
}

util.VERSION = '0.3.0';

// Checks if an object implements an interface.
// __Example:__
//
//      var util =  require('./util');
//      util.checkInterface(myPublisher, interfaces.IPublisher);
util.checkInterface = function(theObject, theInterface, options) {
    options = options || {};    
    var silent = options.silent || false;
    
    for (var member in theInterface) {
        if ( (typeof theObject[member] != typeof theInterface[member]) ) {
            if (!silent) {
                console.log('object failed to implement interface member ' + member);
                console.log(member + ' expected: \'' + typeof theInterface[member] + '\' but was: \'' + typeof theObject[member] + '\'')
            }
            return false;
        }
    }
    //If we get here, it passed the test, so return true.
    return true;
};