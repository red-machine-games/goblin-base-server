'use strict';

var validate = require('./utils/validateConfigs.js');

class GooglePlayCredentials{
    constructor(){
        this.isUp = false;
    }
    serviceAccount(clientEmail, privateKey, bundleId){
        this.googleServiceAccount = { clientEmail, privateKey };
        this.googlePlayBundleId = bundleId;

        validate.isString(this.googleServiceAccount.clientEmail, 'clientEmail', 1);
        validate.isString(this.googleServiceAccount.privateKey, 'privateKey', 1);
        validate.isBundleId(this.googlePlayBundleId, 'bundleId');

        this.isUp = true;
        return this;
    }
    keys(sandboxPublicKey, livePublicKey, bundleId){
        this.googlePublicKeyStrSandBox = sandboxPublicKey;
        this.googlePublicKeyStrLive = livePublicKey;
        this.googlePlayBundleId = bundleId;

        try {
            validate.isString(this.googlePublicKeyStrSandBox, 'sandboxPublicKey', 1);
        } catch(err){
            require('../../index.js').getGoblinBase().logsHook.warn(err);
        }
        validate.isString(this.googlePublicKeyStrLive, 'livePublicKey', 1);
        validate.isBundleId(this.googlePlayBundleId, 'bundleId');

        this.isUp = true;
        return this;
    }
}

module.exports = GooglePlayCredentials;