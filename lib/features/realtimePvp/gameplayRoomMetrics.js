'use strict';

module.exports = {
    metricsTick
};

const goblinBase = require('../../../index.js').getGoblinBase(),
    log = goblinBase.logsHook;

const AMOUNT_OF_PIDNX_KEYS_TO_SCAN = 100;

var toobusy = require('toobusy-js');

var opClients = require('../../operativeSubsystem/opClients.js'),
    metricsForStatsD = require('../../generalUtils/metricsForStatsD.js');

function metricsTick(websocketsCount, callback){
    var wsCount, theOccupation, ccu, avgEventLoopLag;

    function bottleneck(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 525, err: { code: err.code, command: err.command, message: err.message } });
                callback(err);
            } else if(response){
                [wsCount, theOccupation, ccu, avgEventLoopLag] = response.split(';');
                ccu = ccu === '-1' ? null : +ccu;
                pushMetrics();
            } else {
                callback(null);
            }
        };

        opClients.getGameplayRoomClient().metricsBottleneck([
            process.pid, websocketsCount, toobusy.lag(),
            AMOUNT_OF_PIDNX_KEYS_TO_SCAN,
            goblinBase.pvpConfig.numericConstants.heartbeatIntervalMs * 2,
            goblinBase.pvpConfig.numericConstants.heartbeatIntervalMs
        ], callbackFn);
    }
    function pushMetrics(){
        metricsForStatsD.pushPvpMetrics(
            +wsCount || 0, goblinBase.pvpConfig.pairsCapacity - (+theOccupation || 0),
            +ccu || 0, +avgEventLoopLag || 0
        );
        callback(null);
    }

    bottleneck();
}