'use strict';

const goblinBase = require('../../../../index.js').getGoblinBase(),
    log = goblinBase.logsHook,
    cflog = goblinBase.logsCloudFunctionsHook;

var _ = require('lodash'),
    os = require('os'),
    crc32 = require('crc-32'),
    clone = require('clone');

const INT32_MAX = 2147483647;

var metricsForStatsD = require('../../../generalUtils/metricsForStatsD.js'),
    opClients = require('../../../operativeSubsystem/opClients.js');

const HOST_NAME = os.hostname();

class CfLoggerFacade{
    constructor(runTs, cfName){
        this.runTs = runTs;
        this.cfName = cfName;
        this.cfLoggerImplementation = undefined;
    }
    error(message, meta){
        if(!this.cfLoggerImplementation){
            this.cfLoggerImplementation = new CfLogger(this.runTs, this.cfName);
        }
        this.cfLoggerImplementation.error(message, meta);
    }
    warn(message, meta){
        if(!this.cfLoggerImplementation){
            this.cfLoggerImplementation = new CfLogger(this.runTs, this.cfName);
        }
        this.cfLoggerImplementation.warn(message, meta);
    }
    info(message, meta){
        if(!this.cfLoggerImplementation){
            this.cfLoggerImplementation = new CfLogger(this.runTs, this.cfName);
        }
        this.cfLoggerImplementation.info(message, meta);
    }
    debug(message, meta){
        if(!this.cfLoggerImplementation){
            this.cfLoggerImplementation = new CfLogger(this.runTs, this.cfName);
        }
        this.cfLoggerImplementation.debug(message, meta);
    }
    persistLogs(endTs){
        if(this.cfLoggerImplementation){
            this.cfLoggerImplementation.persistLogs(endTs);
        }
    }
}

class CfLogger{
    constructor(runTs, cfName){
        this.runTs = runTs;
        this.cfName = cfName;
        this.pm2Id = metricsForStatsD.getItsPm2Id();
        this.backlog = [];
    }
    error(message, meta){
        this.backlog.push({ l: 'error', m: message, mt: meta, ts: _.now() });
    }
    warn(message, meta){
        this.backlog.push({ l: 'warn', m: message, mt: meta, ts: _.now() });
    }
    info(message, meta){
        this.backlog.push({ l: 'info', m: message, mt: meta, ts: _.now() });
    }
    debug(message, meta){
        this.backlog.push({ l: 'debug', m: message, mt: meta, ts: _.now() });
    }
    persistLogs(endTs){
        var laThis = this;

        function doHash(){
            let callbackFn = (err, response) => {
                if(err){
                    log.error('OP Error', { code: 1081, err: { code: err.code, command: err.command, message: err.message } });
                } else {
                    laThis.endTs = endTs;
                    laThis.runTime = laThis.endTs - laThis.runTs;
                    laThis.hash = (crc32.str(`${laThis.runTs}:${laThis.cfName}:${response}`) + INT32_MAX).toString(16);
                    doPersistEverything();
                }
            };

            opClients.getServiceClient().getRedis().incr('cf_logger_incr', callbackFn);
        }
        function doPersistEverything(){
            cflog.info('Run CF', {
                name: laThis.cfName, rts: laThis.runTs, ets: laThis.endTs, dur: laThis.runTime,
                pid: laThis.pm2Id, host: HOST_NAME, cfhash: laThis.hash
            });
            _.each(laThis.backlog, m => cflog[m.l](m.m, _.assign(clone(m.mt), { ms: m.ts - laThis.runTs, cfhash: laThis.hash })));
        }

        doHash();
    }
}

module.exports = {
    CfLoggerFacade
};