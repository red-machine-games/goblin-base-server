'use strict';

const DEFAULT_SERVICE_TOKEN_URL = 'https://oauth.vk.com/access_token',
    DEFAULT_SERVICE_TOKEN_GRAND_TYPE = 'client_credentials',
    DEFAULT_SERVICE_TOKEN_V = '5.87',
    DEFAULT_SERVICE_TOKEN_TIMELIFE_MS = 86400 * 1000,
    DEFAULT_SERVICE_TOKEN_EXTERNAL_API_TIMEOUT_MS = 20 * 1000;

var validate = require('./utils/validateConfigs.js');

class VkCredentials{
    constructor(opts){
        this.clientId = opts.clientId;
        this.clientSecret = opts.clientSecret;
        this.useTokenAsId = !!opts.useTokenAsId;
        this.devHelp = !!opts.devHelp;

        this.serviceToken = {
            url: DEFAULT_SERVICE_TOKEN_URL,
            grandType: DEFAULT_SERVICE_TOKEN_GRAND_TYPE,
            v: DEFAULT_SERVICE_TOKEN_V,
            defaultTokenLifetime: DEFAULT_SERVICE_TOKEN_TIMELIFE_MS,
            externalApiTimeout: DEFAULT_SERVICE_TOKEN_EXTERNAL_API_TIMEOUT_MS
        };
        if(opts.serviceToken){
            if(opts.serviceToken.url){
                this.serviceToken.url = opts.serviceToken.url;
            }
            if(opts.serviceToken.grandType){
                this.serviceToken.grandType = opts.serviceToken.grandType;
            }
            if(opts.serviceToken.v){
                this.serviceToken.v = opts.serviceToken.v;
            }
            if(opts.serviceToken.defaultTokenLifetime){
                this.serviceToken.defaultTokenLifetime = opts.serviceToken.defaultTokenLifetime;
            }
            if(opts.serviceToken.externalApiTimeout){
                this.serviceToken.externalApiTimeout = opts.serviceToken.externalApiTimeout;
            }
        }

        this._validateIt();
    }
    _validateIt(){
        validate.isNumber(this.clientId, 'clientId', 1);
        validate.isString(this.clientSecret, 'clientSecret', 1);
        validate.isBoolean(this.useTokenAsId, 'useTokenAsId');
        validate.isBoolean(this.devHelp, 'devHelp');
        validate.isString(this.serviceToken.url, 'serviceToken.url', 1);
        validate.isString(this.serviceToken.grandType, 'serviceToken.grandType', 1);
        validate.isString(this.serviceToken.v, 'serviceToken.v', 1);
        validate.isNumber(this.serviceToken.defaultTokenLifetime, 'serviceToken.defaultTokenLifetime', 1000);
        validate.isNumber(this.serviceToken.externalApiTimeout, 'serviceToken.externalApiTimeout', 1000);
    }
}

module.exports = VkCredentials;