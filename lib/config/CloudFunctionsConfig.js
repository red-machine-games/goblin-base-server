'use strict';

const DEFAULT_CUSTOM_SESSION = true,
    DEFAULT_ENABLE_TRACES = true,
    DEFAULT_ENABLE_SET_TIMEOUT = false,
    DEFAULT_RESOURCES = null,
    DEFAULT_ALLOW_TO_PUSH_INIT_CONTEXT = false,
    DEFAULT_ATOMIC_BATCH_SIZE = 100,
    DEFAULT_ATOMIC_REFRESH_PACKAGE_TIMEOUT = 1000,
    DEFAULT_ATOMIC_ALL_REFRESH_TIMEOUT = 10 * 1000;

var validate = require('./utils/validateConfigs.js');

class CloudFunctionsConfig{
    constructor(opts){
        this.customSession = opts.customSession != null ? opts.customSession : DEFAULT_CUSTOM_SESSION;
        this.enableTraces = opts.enableTraces != null ? opts.enableTraces : DEFAULT_ENABLE_TRACES;
        this.enableSetTimeout = opts.enableSetTimeout != null ? opts.enableSetTimeout : DEFAULT_ENABLE_SET_TIMEOUT;
        this.resources = opts.resources != null ? opts.resources : DEFAULT_RESOURCES;
        this.allowToPushInitContext = opts.allowToPushInitContext != null ? opts.allowToPushInitContext : DEFAULT_ALLOW_TO_PUSH_INIT_CONTEXT;

        this.atomic = {
            batchSize: DEFAULT_ATOMIC_BATCH_SIZE,
            refreshPackageTimeout: DEFAULT_ATOMIC_REFRESH_PACKAGE_TIMEOUT,
            allRefreshTimeout: DEFAULT_ATOMIC_ALL_REFRESH_TIMEOUT
        };
        if(opts.atomic){
            if(opts.atomic.batchSize > 0){
                this.atomic.batchSize = opts.atomic.batchSize;
            }
            if(opts.atomic.refreshPackageTimeout > 0){
                this.atomic.refreshPackageTimeout = opts.atomic.refreshPackageTimeout;
            }
            if(opts.atomic.allRefreshTimeout > 0){
                this.atomic.allRefreshTimeout = opts.atomic.allRefreshTimeout;
            }
        }

        this._validateIt();
    }
    _validateIt(){
        validate.isBoolean(this.customSession, 'customSession');
        validate.isBoolean(this.enableTraces, 'enableTraces');
        validate.isBoolean(this.enableSetTimeout, 'enableSetTimeout');

        validate.isNumber(this.atomic.batchSize, 'atomic.batchSize', 1, 10000);
        validate.isNumber(this.atomic.refreshPackageTimeout, 'atomic.refreshPackageTimeout', 1);
        validate.isNumber(this.atomic.allRefreshTimeout, 'atomic.allRefreshTimeout', 1);
    }
}

module.exports = CloudFunctionsConfig;