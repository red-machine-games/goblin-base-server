'use strict';

const DEFAULT_STATSD_HOST = '127.0.0.1',
    DEFAULT_STATSD_PORT = 8125,
    DEFAULT_NUMERIC_CONST_SESSIONS_COUNTER_BATCH_SIZE = 100,
    DEFAULT_NUMERIC_CONST_SESSIONS_COUNTER_BLOCK_MS = 5 * 1000,
    DEFAULT_NUMERIC_CONST_SESSIONS_COUNTER_LAZY_BLOCK_MS = 1000;

var validate = require('./utils/validateConfigs.js');

class StatsdOutputConfig{
    constructor(opts){
        this.statsdHost = opts.statsdHost != null ? opts.statsdHost : DEFAULT_STATSD_HOST;
        this.statsdPort = opts.statsdPort != null ? opts.statsdPort : DEFAULT_STATSD_PORT;

        this.numericConstants = {
            sessionsCounterBatchSize: DEFAULT_NUMERIC_CONST_SESSIONS_COUNTER_BATCH_SIZE,
            sessionsCounterBlockMs: DEFAULT_NUMERIC_CONST_SESSIONS_COUNTER_BLOCK_MS,
            sessionsCounterLazyBlockMs: DEFAULT_NUMERIC_CONST_SESSIONS_COUNTER_LAZY_BLOCK_MS
        };
        if(opts.numericConstants){
            if(opts.numericConstants.sessionsCounterBatchSize){
                this.numericConstants.sessionsCounterBatchSize = opts.numericConstants.sessionsCounterBatchSize;
            }
            if(opts.numericConstants.sessionsCounterBlockMs){
                this.numericConstants.sessionsCounterBlockMs = opts.numericConstants.sessionsCounterBlockMs;
            }
            if(opts.numericConstants.sessionsCounterLazyBlockMs){
                this.numericConstants.sessionsCounterLazyBlockMs = opts.numericConstants.sessionsCounterLazyBlockMs;
            }
        }

        this._validateIt();
    }
    _validateIt(){
        try {
            validate.isIpAddress(this.statsdHost, 'statsdHost');
        } catch(err){
            require('../../index.js').getGoblinBase().logsHook.warn(err);
        }
        validate.isNumber(this.statsdPort, 'statsdPort', 1, 65535);
        validate.isNumber(this.numericConstants.sessionsCounterBatchSize, 'numericConstants.sessionsCounterBatchSize', 1);
        validate.isNumber(this.numericConstants.sessionsCounterBlockMs, 'numericConstants.sessionsCounterBlockMs', 0);
        validate.isNumber(this.numericConstants.sessionsCounterLazyBlockMs, 'numericConstants.sessionsCounterLazyBlockMs', 0);
    }
}

module.exports = StatsdOutputConfig;