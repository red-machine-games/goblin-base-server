'use strict';

var validate = require('./utils/validateConfigs.js');

class AppStoreCredentials{
    constructor(){
        this.applePassword = opts.applePassword;
        this.appStoreBundleId = opts.bundleId;

        this._validateIt();
        this.isUp = true;
    }
    _validateIt(){
        validate.isString(this.applePassword, 'applePassword', 3, 90);
        validate.isBundleId(this.appStoreBundleId, 'appStoreBundleId');
    }
}

module.exports = AppStoreCredentials;