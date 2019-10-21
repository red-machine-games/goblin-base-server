'use strict';

var validate = require('./utils/validateConfigs.js');

class CloudFunctionsExtension{
    constructor(methodName, methodItself){
        this.methodName = methodName;
        this.methodItself = methodItself;

        this._validateIt();
    }
    _validateIt(){
        validate.functionName(this.methodName, 'methodName');
        validate.isFunction(this.methodItself, 'methodItself');
    }
}

module.exports = CloudFunctionsExtension;