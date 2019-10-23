'use strict';

const DEFAULT_ORDER = 'desc',
    DEFAULT_WHITELIST_SEGMENTS = ['def'],
    DEFAULT_ALLOW_PUBLIC_LISTING = false,
    DEFAULT_NUMERIC_CONST_SEED_PAGE_TIME = 15 * 1000,
    DEFAULT_NUMERIC_CONST_BATCH_SIZE = 50,
    DEFAULT_NUMERIC_CONST_REFRESH_PACKAGE_TIMEOUT = 1000,
    DEFAULT_NUMERIC_CONST_ALL_REFRESH_TIMEOUT = 60 * 1000,
    DEFAULT_NUMERIC_CONST_SOC_FRIENDS_CACHE_TTL = 1000 * 60 * 60 * 24 * 7,
    DEFAULT_NUMERIC_CONST_OPERATIVE_RECORDS_LIFETIME = 1000 * 60 * 60 * 5;

var validate = require('./utils/validateConfigs.js');

class LeaderboardsConfig{
    constructor(opts){
        this.order = opts.order != null ? opts.order : DEFAULT_ORDER;
        this.whitelistSegments = opts.whitelistSegments || DEFAULT_WHITELIST_SEGMENTS;
        this.allowPublicListing = opts.allowPublicListing != null ? opts.allowPublicListing : DEFAULT_ALLOW_PUBLIC_LISTING;

        this.numericConstants = {
            seedPageTime: DEFAULT_NUMERIC_CONST_SEED_PAGE_TIME,
            batchSize: DEFAULT_NUMERIC_CONST_BATCH_SIZE,
            refreshPackageTimeout: DEFAULT_NUMERIC_CONST_REFRESH_PACKAGE_TIMEOUT,
            allRefreshTimeout: DEFAULT_NUMERIC_CONST_ALL_REFRESH_TIMEOUT,
            socFriendsCacheTtl: DEFAULT_NUMERIC_CONST_SOC_FRIENDS_CACHE_TTL,
            operativeRecordLifetime: DEFAULT_NUMERIC_CONST_OPERATIVE_RECORDS_LIFETIME
        };
        if(opts.numericConstants){
            if(opts.numericConstants.seedPageTime){
                this.numericConstants.seedPageTime = opts.numericConstants.seedPageTime;
            }
            if(opts.numericConstants.batchSize){
                this.numericConstants.batchSize = opts.numericConstants.batchSize;
            }
            if(opts.numericConstants.refreshPackageTimeout){
                this.numericConstants.refreshPackageTimeout = opts.numericConstants.refreshPackageTimeout;
            }
            if(opts.numericConstants.allRefreshTimeout){
                this.numericConstants.allRefreshTimeout = opts.numericConstants.allRefreshTimeout;
            }
            if(opts.numericConstants.socFriendsCacheTtl){
                this.numericConstants.socFriendsCacheTtl = opts.numericConstants.socFriendsCacheTtl;
            }
            if(opts.numericConstants.operativeRecordLifetime){
                this.numericConstants.operativeRecordLifetime = opts.numericConstants.operativeRecordLifetime;
            }
        }

        this._validateIt();
    }
    _validateIt(){
        validate.isOrder(this.order, 'order');
        validate.isArray(this.whitelistSegments, 'whitelistSegments', 1);
        validate.isBoolean(this.allowPublicListing, 'allowPublicListing');
        validate.isNumber(this.numericConstants.seedPageTime, 'numericConstants.seedPageTime', 1);
        validate.isNumber(this.numericConstants.batchSize, 'numericConstants.batchSize', 1);
        validate.isNumber(this.numericConstants.refreshPackageTimeout, 'numericConstants.refreshPackageTimeout', 0);
        validate.isNumber(this.numericConstants.allRefreshTimeout, 'numericConstants.allRefreshTimeout', 0);
        validate.isNumber(this.numericConstants.socFriendsCacheTtl, 'numericConstants.socFriendsCacheTtl', 1000);
        validate.isNumber(this.numericConstants.operativeRecordLifetime, 'numericConstants.operativeRecordLifetime', 1000);
    }
}

module.exports = LeaderboardsConfig;