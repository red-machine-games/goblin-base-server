'use strict';

module.exports = {
    cleanObjectFromContext
};

var traverse = require('traverse');

function cleanObjectFromContext(object){
    if(typeof object === 'object'){
        return traverse(object).map(function () { if (this.circular) this.remove(); });
    } else {
        return object;
    }
}