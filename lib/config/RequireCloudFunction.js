'use strict';

var validate = require('./utils/validateConfigs.js');

class RequireCloudFunction{
    constructor(path){
        this.path = path;

        this._validateIt();
    }
    _validateIt(){
        validate.isString(this.path, 'path', 1);
    }
}

module.exports = RequireCloudFunction;