'use strict';

const DEFAULT_SERVICE_API_URL = 'https://graph.facebook.com/',
    DEFAULT_MARKER_GRANT_TYPE = 'client_credentials',
    DEFAULT_MARKER_LIFETIME_MS = 86400 * 1000,
    DEFAULT_EXTERNAL_API_TIMEOUT_MS = 20 * 1000;

var validate = require('./utils/validateConfigs.js');

class FacebookCredentials{
    constructor(opts){
        this.clientId = opts.clientId;
        this.clientSecret = opts.clientSecret;
        this.useTokenAsId = !!opts.useTokenAsId;

        this.serviceApi = {
            url: DEFAULT_SERVICE_API_URL,
            externalApiTimeout: DEFAULT_EXTERNAL_API_TIMEOUT_MS
        };
        if(opts.serviceApi){
            if(opts.serviceApi.url){
                this.serviceApi.url = opts.serviceApi.url;
            }
            if(opts.serviceApi.externalApiTimeout){
                this.serviceApi.externalApiTimeout = opts.serviceApi.externalApiTimeout;
            }
        }
        this.markerApi = {
            url: `${DEFAULT_SERVICE_API_URL}oauth/access_token`,
            grandType: DEFAULT_MARKER_GRANT_TYPE,
            defaultMarkerLifetime: DEFAULT_MARKER_LIFETIME_MS
        };
        if(opts.markerApi){
            if(opts.markerApi.url){
                this.markerApi.url = opts.markerApi.url;
            }
            if(opts.markerApi.grandType){
                this.markerApi.grandType = opts.markerApi.grandType;
            }
            if(opts.markerApi.defaultMarkerLifetime){
                this.markerApi.defaultMarkerLifetime = opts.markerApi.defaultMarkerLifetime;
            }
            if(opts.markerApi.externalApiTimeout){
                this.markerApi.externalApiTimeout = opts.markerApi.externalApiTimeout;
            }
        }

        this._validateIt();
    }
    _validateIt(){
        validate.isNumber(this.clientId, 'clientId', 1);
        validate.isString(this.clientSecret, 'clientSecret', 5, 256);
        validate.isBoolean(this.useTokenAsId, 'useTokenAsId');
        validate.isString(this.serviceApi.url, 'serviceApi.url', 1);
        validate.isNumber(this.serviceApi.externalApiTimeout, 'serviceApi.externalApiTimeout', 1000);
        validate.isString(this.markerApi.url, 'markerApi.url', 1);
        validate.isString(this.markerApi.grandType, 'markerApi.grandType', 1);
        validate.isNumber(this.markerApi.defaultMarkerLifetime, 'markerApi.defaultMarkerLifetime', 1000);
    }
}

module.exports = FacebookCredentials;