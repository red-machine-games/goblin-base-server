'use strict';

const DEFAULT_UNLINKED_PROFILE_TTL_MS = 1000 * 60 * 10,
    DEFAULT_PROFILES_REFRESH_BATCH_SIZE = 50,
    DEFAULT_PROFILES_REFRESH_PACKAGE_TIMEOUT = 1000 * 60,
    DEFAULT_PROFILES_REFRESH_ALL_TIMEOUT = 1000 * 60 * 30;

var validate = require('./utils/validateConfigs.js');

class ProfilesConfig{
    constructor(opts){
        this.numericConstants = {
            unlinkedProfileTtlMs: DEFAULT_UNLINKED_PROFILE_TTL_MS,
            profilesRefreshBatchSize: DEFAULT_PROFILES_REFRESH_BATCH_SIZE,
            profilesRefreshPackageTimeout: DEFAULT_PROFILES_REFRESH_PACKAGE_TIMEOUT,
            profilesRefreshAllTimeout: DEFAULT_PROFILES_REFRESH_ALL_TIMEOUT
        };

        if(opts.numericConstants){
            if(opts.numericConstants.unlinkedProfileTtlMs){
                this.numericConstants.unlinkedProfileTtlMs = opts.numericConstants.unlinkedProfileTtlMs;
            }
            if(opts.numericConstants.profilesRefreshBatchSize){
                this.numericConstants.profilesRefreshBatchSize = opts.numericConstants.profilesRefreshBatchSize;
            }
            if(opts.numericConstants.profilesRefreshPackageTimeout){
                this.numericConstants.profilesRefreshPackageTimeout = opts.numericConstants.profilesRefreshPackageTimeout;
            }
            if(opts.numericConstants.profilesRefreshAllTimeout){
                this.numericConstants.profilesRefreshAllTimeout = opts.numericConstants.profilesRefreshAllTimeout;
            }
        }

        this._validateIt();
    }
    _validateIt(){
        validate.isNumber(this.numericConstants.unlinkedProfileTtlMs, 'numericConstants.unlinkedProfileTtlMs', 1);
        validate.isNumber(this.numericConstants.profilesRefreshBatchSize, 'numericConstants.profilesRefreshBatchSize', 1);
        validate.isNumber(this.numericConstants.profilesRefreshPackageTimeout, 'numericConstants.profilesRefreshPackageTimeout', 0);
        validate.isNumber(this.numericConstants.profilesRefreshAllTimeout, 'numericConstants.profilesRefreshAllTimeout', 0);
    }
}

module.exports = ProfilesConfig;