var root = this;

var Util;

if (typeof exports !== 'undefined') {
    Util = exports;
} else {
    Util = root.EventStore.Util = {};
}

Util.VERSION = '0.0.1';

// Checks if an object implements an interface.
Util.checkInterface = function(theObject, theInterface, options) {
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

// This function returns the object type.
Util.getObjectType = function(obj) {
    if (obj.constructor && obj.constructor.toString) {
        obType = obj.constructor.toString().match(/function\s+(\w+)/);
		
        if (obType && obType.length == 2) {
		    return obType[1];
        }
    }
		
	return 'undefined';
};