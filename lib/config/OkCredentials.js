'use strict';

const DEFAULT_SERVICE_API_URL = 'https://api.ok.ru/fb.do?',
    DEFAULT_SERVICE_API_TIMEOUT_MS = 20 * 1000;

var validate = require('./utils/validateConfigs.js');

class OkCredentials{
    constructor(opts){
        this.applicationPublicKey = opts.applicationPublicKey;
        this.applicationSecretKey = opts.applicationSecretKey;
        this.useTokenAsId = !!opts.useTokenAsId;
        this.devHelp = !!opts.devHelp;

        this.serviceApi = {
            url: DEFAULT_SERVICE_API_URL,
            externalApiTimeout: DEFAULT_SERVICE_API_TIMEOUT_MS
        };
        if(opts.serviceApi){
            if(opts.serviceApi.url){
                this.serviceApi.url = opts.serviceApi.url;
            }
            if(opts.serviceApi.externalApiTimeout){
                this.serviceApi.externalApiTimeout = opts.serviceApi.externalApiTimeout;
            }
        }

        this._validateIt();
    }
    _validateIt(){
        validate.isString(this.applicationPublicKey, 'applicationPublicKey', 6);
        validate.isString(this.applicationSecretKey, 'applicationSecretKey', 6);
        validate.isBoolean(this.useTokenAsId, 'useTokenAsId');
        validate.isBoolean(this.devHelp, 'devHelp');
        validate.isString(this.serviceApi.url, 'serviceApi.url', 1);
        validate.isNumber(this.serviceApi.externalApiTimeout, 'serviceApi.externalApiTimeout', 1000);
    }
}

module.exports = OkCredentials;