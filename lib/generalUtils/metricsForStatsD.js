'use strict';

module.exports = {
    init,
    getItsPm2Id,
    measureRequest,
    tryToMeasureCCU,
    pushPvpMetrics,
    measureCustomGameMetric,
    close
};

const goblinBase = require('../../index.js').getGoblinBase(),
    log = goblinBase.logsHook;

var _ = require('lodash'),
    Lynx = require('lynx'),
    pm2 = require('pm2'),
    metrics;

var opClients = require('../operativeSubsystem/opClients.js');

const GATHER_INFO_EVERY_S = 2500;

var ErrorResponse = require('../objects/ErrorResponse.js');

var thisPmId,
    infoGathererTimer;

var ccuMeasureLazyBlock = _.now();

function init(callback){
    let callbackFn = (err, response) => {
        if(err){
            callback(err, null);
        } else if(response && response.length){
            response = response.find(e => e.pid === process.pid);
            if(response){
                thisPmId = response.pm_id;
                if(goblinBase.statsdOutputConfig){
                    metrics = new Lynx(goblinBase.statsdOutputConfig.statsdHost, goblinBase.statsdOutputConfig.statsdPort, { on_error: err => log.error(err) });
                    infoGathererTimer = setInterval(gatherInfo, GATHER_INFO_EVERY_S);
                }
                callback(null, true);
            } else {
                callback(null, false);
            }
        } else {
            callback(null, false);
        }
    };

    pm2.list(callbackFn);
}
function getItsPm2Id(){
    return thisPmId;
}
function gatherInfo(){
    let callbackFn = (err, response) => {
        if(response && response.length){
            response = _.first(response);
            metrics.gauge(`node.monit_cpu,pid=${process.pid},pmid=${thisPmId}`, response.monit.cpu);
            metrics.gauge(`node.monit_mem,pid=${process.pid},pmid=${thisPmId}`, response.monit.memory);
            tryToMeasureCCU(_.now(), _.noop);
        }
    };

    pm2.describe(thisPmId, callbackFn);
}
function measureRequest(req, res, next){
    if(metrics){
        let requestTimer = metrics.createTimer(`node.request_time,method=${req.method},uri=${req.originalUrl},pid=${process.pid},pmid=${thisPmId}`);
        let onFinish = () => {
            res.removeListener('finish', onFinish);
            requestTimer.stop();
            metrics.increment(`node.request_fact,method=${req.method},uri=${req.originalUrl},code=${res.statusCode},pid=${process.pid},pmid=${thisPmId}`);
        };

        res.on('finish', onFinish);
    }

    next();
}
function tryToMeasureCCU(now, callback){
    if(metrics && opClients.getSessionsClient && now > ccuMeasureLazyBlock){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 958, err: { code: err.code, command: err.command, message: err.message } });
                callback(new ErrorResponse(958, 'OP Error'));
            } else {
                if(response !== '1'){
                    ccuMeasureLazyBlock = now + goblinBase.statsdOutputConfig.numericConstants.sessionsCounterLazyBlockMs;
                    if(response.startsWith('2;')){
                        let [__, sess_current_count] = response.split(';');
                        metrics.gauge('game.ccu', +sess_current_count || 0);
                    }
                }
                callback(null);
            }
        };



        opClients.getSessionsClient().countUnicornSessions([
            goblinBase.statsdOutputConfig.numericConstants.sessionsCounterBatchSize,
            goblinBase.statsdOutputConfig.numericConstants.sessionsCounterBlockMs
        ], callbackFn);
    } else {
        callback(null);
    }
}
function pushPvpMetrics(totalWsConnections, numOfOccupiedRooms, pvpCCU, eventLoopLag){
    measureCustomGameMetric('web-sockets', totalWsConnections);
    measureCustomGameMetric('occupied-rooms', numOfOccupiedRooms);
    measureCustomGameMetric('pvp-ccu', pvpCCU);
    measureCustomGameMetric('eventloop-lag', eventLoopLag);
}
function measureCustomGameMetric(name, value) {
    if(metrics && _.isNumber(value)){
        metrics.gauge(`game.${name}`, value);
    }
}

function close(){
    if(infoGathererTimer){
        clearInterval(infoGathererTimer);
    }
    if(metrics){
        metrics.close();
        metrics = null;
    }
}