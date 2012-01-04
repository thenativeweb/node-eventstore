//     lib/logger/consoleLogger.js v0.0.1
//     (c) 2012 Kaba AG, MIC AWM; under MIT License
//     (by) Jan Muehlemann (jamuhl)
//        , Adriano Raiano (adrai)

// You could use this console logger or provide your own implementation.
var root = this
  , logger;

if (typeof module.exports !== 'undefined') {
    logger = module.exports;
} else {
    logger = root.consoleLogger = {};
}

logger.info = function(msg) {
    log('info', 'green', msg);
};
    
logger.warn = function(msg) {
    log('warn', 'yellow', msg);
};
    
logger.error = function(msg) {
    log('error', 'red', msg);
};


function log(prefix, style, msg) {
    console.log(stylize(prefix, style) + ': ' + new Date().toLocaleString() + ': ' + msg);
}

function stylize(str, style) {
    
    // define the styles
    var styles = {
    //styles
    'bold'      : [1,  22], 'italic'    : [3,  23],
    'underline' : [4,  24], 'inverse'   : [7,  27],
    //grayscales
    'white'     : [37, 39], 'grey'      : [90, 39],
    'black'     : [90, 39],
    //colors
    'blue'      : [34, 39], 'cyan'      : [36, 39],
    'green'     : [32, 39], 'magenta'   : [35, 39],
    'red'       : [31, 39], 'yellow'    : [33, 39]
    };
    return '\033[' + styles[style][0] + 'm' + str + '\033[' + styles[style][1] + 'm';
}