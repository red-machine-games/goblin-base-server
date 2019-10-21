'use strict';

const DEFAULT_EVENT_LOOP_MAX_LAG = 5 * 1000,
    DEFAULT_EVENT_LOOP_CHECK_INTERVAL = 500,
    DEFAULT_ARTIFICIALLY_LIMIT_CCU = 0;

var validate = require('./utils/validateConfigs.js');

class WorkloadControlConfig{
    constructor(opts){
        this.eventLoopMaxLag = opts.eventLoopMaxLag != null ? opts.eventLoopMaxLag : DEFAULT_EVENT_LOOP_MAX_LAG;
        this.eventLoopCheckInterval = opts.eventLoopCheckInterval != null ? opts.eventLoopCheckInterval : DEFAULT_EVENT_LOOP_CHECK_INTERVAL;
        this.artificiallyLimitCCU = opts.artificiallyLimitCCU != null ? opts.artificiallyLimitCCU : DEFAULT_ARTIFICIALLY_LIMIT_CCU;

        this._validateIt();
    }
    _validateIt(){
        validate.isNumber(this.eventLoopMaxLag, 'eventLoopMaxLag', 1);
        validate.isNumber(this.eventLoopCheckInterval, 'eventLoopCheckInterval', 1);
        validate.isNumber(this.artificiallyLimitCCU, 'artificiallyLimitCCU', 0, 250);
    }
}

module.exports = WorkloadControlConfig;