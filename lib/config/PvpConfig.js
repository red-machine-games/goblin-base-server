'use strict';

const DEFAULT_PHYSICAL_HOST = '127.0.0.1',
    DEFAULT_SHARE_IP_ADDRESS = false,
    DEFAULT_DISPLAY_PORT_WS = 80,
    DEFAULT_DISPLAY_PORT_WSS = 443,
    DEFAULT_PHYSICAL_PORT = 7332,
    DEFAULT_BIND_UDP_ON_PORT = 54321,
    DEFAULT_API_PREFIX = 'api/v0/',
    DEFAULT_PAIRS_CAPACITY = 100,
    DEFAULT_RESEND_FINAL_WS_MESSAGES = false,
    DEFAULT_ATTACH_MESSAGE_TIME_AT_ROOM = false,
    // ---
    DEFAULT_NUMERIC_CONST_HEARTBEAT_INTERVAL_MS = 500,
    DEFAULT_NUMERIC_CONST_TIME_TO_CONNECT_PAIR_MS = 15 * 1000,
    DEFAULT_NUMERIC_CONST_CHECK_SOCKETS_EVERY_MS = 2 * 1000,
    DEFAULT_NUMERIC_CONST_CONNECTION_LOCK_TTL_MS = 15 * 1000,
    DEFAULT_NUMERIC_CONST_MESSAGE_LOCK_TTL_MS = 5 * 1000,
    DEFAULT_NUMERIC_CONST_PAIR_IN_GAME_TTL_MS = 30 * 1000,
    DEFAULT_NUMERIC_CONST_SOCKET_TTL_MS = 3 * 1000,
    DEFAULT_NUMERIC_CONST_TIME_TO_PROCESS_MESSAGE_MS = 10 * 1000,
    DEFAULT_NUMERIC_CONST_UNPAUSED_GAME_TTL_MS = 30 * 1000,
    DEFAULT_NUMERIC_CONST_PAUSED_PAIR_TTL_MS = 20 * 1000,
    DEFAULT_NUMERIC_CONST_PAUSED_TIMED_OUT_PAIR_INACTIVITY_MS = 15 * 1000,
    DEFAULT_NUMERIC_CONST_REFRESH_STATS_RELOADING_MS = 1000,
    DEFAULT_NUMERIC_CONST_REFRESH_STATS_BATCH_SIZE = 100,
    DEFAULT_NUMERIC_CONST_REFRESH_OCCUPATION_RELOADING_MS = 1000,
    DEFAULT_NUMERIC_CONST_ABSOLUTE_MAXIMUM_GAMEPLAY_TTL_MS = 15 * 60 * 1000;

var validate = require('./utils/validateConfigs.js');

class PvpConfig{
    constructor(opts){
        this.physicalHost = opts.physicalHost != null ? opts.physicalHost : DEFAULT_PHYSICAL_HOST;
        this.displayHost = opts.displayHost;
        this.shareIPAddress = opts.shareIPAddress != null ? opts.shareIPAddress : DEFAULT_SHARE_IP_ADDRESS;
        this.displayPortWs = opts.displayPortWs != null ? opts.displayPortWs : DEFAULT_DISPLAY_PORT_WS;
        this.displayPortWss = opts.displayPortWss != null ? opts.displayPortWss : DEFAULT_DISPLAY_PORT_WSS;
        this.physicalPort = opts.physicalPort != null ? opts.physicalPort : DEFAULT_PHYSICAL_PORT;
        this.bindUdpOnPort = opts.bindUdpOnPort != null ? opts.bindUdpOnPort : DEFAULT_BIND_UDP_ON_PORT;
        this.apiPrefix = opts.apiPrefix != null ? opts.apiPrefix : DEFAULT_API_PREFIX;
        this.pairsCapacity = opts.pairsCapacity != null ? opts.pairsCapacity : DEFAULT_PAIRS_CAPACITY;
        this.resendFinalWsMessages = opts.resendFinalWsMessages != null ? opts.resendFinalWsMessages : DEFAULT_RESEND_FINAL_WS_MESSAGES;
        this.attachMessageTimeAtRoom = opts.attachMessageTimeAtRoom != null ? opts.attachMessageTimeAtRoom : DEFAULT_ATTACH_MESSAGE_TIME_AT_ROOM;

        this.numericConstants = {
            heartbeatIntervalMs: DEFAULT_NUMERIC_CONST_HEARTBEAT_INTERVAL_MS,
            timeToConnectPairMs: DEFAULT_NUMERIC_CONST_TIME_TO_CONNECT_PAIR_MS,
            checkSocketsEveryMs: DEFAULT_NUMERIC_CONST_CHECK_SOCKETS_EVERY_MS,
            connectionLockTtlMs: DEFAULT_NUMERIC_CONST_CONNECTION_LOCK_TTL_MS,
            messageLockTtlMs: DEFAULT_NUMERIC_CONST_MESSAGE_LOCK_TTL_MS,
            pairInGameTtlMs: DEFAULT_NUMERIC_CONST_PAIR_IN_GAME_TTL_MS,
            socketTtlMs: DEFAULT_NUMERIC_CONST_SOCKET_TTL_MS,
            timeToProcessMessageMs: DEFAULT_NUMERIC_CONST_TIME_TO_PROCESS_MESSAGE_MS,
            unpausedGameTtlMs: DEFAULT_NUMERIC_CONST_UNPAUSED_GAME_TTL_MS,
            pausedPairTtlMs: DEFAULT_NUMERIC_CONST_PAUSED_PAIR_TTL_MS,
            pausedTimedoutPairInactivityMs: DEFAULT_NUMERIC_CONST_PAUSED_TIMED_OUT_PAIR_INACTIVITY_MS,
            refreshStatsReloadingMs: DEFAULT_NUMERIC_CONST_REFRESH_STATS_RELOADING_MS,
            refreshStatsBatchSize: DEFAULT_NUMERIC_CONST_REFRESH_STATS_BATCH_SIZE,
            refreshOccupationReloadingMs: DEFAULT_NUMERIC_CONST_REFRESH_OCCUPATION_RELOADING_MS,
            absoluteMaximumGameplayTtlMs: DEFAULT_NUMERIC_CONST_ABSOLUTE_MAXIMUM_GAMEPLAY_TTL_MS
        };
        if(opts.numericConstants){
            if(opts.numericConstants.heartbeatIntervalMs){
                this.numericConstants.heartbeatIntervalMs = opts.numericConstants.heartbeatIntervalMs;
            }
            if(opts.numericConstants.timeToConnectPairMs){
                this.numericConstants.timeToConnectPairMs = opts.numericConstants.timeToConnectPairMs;
            }
            if(opts.numericConstants.checkSocketsEveryMs){
                this.numericConstants.checkSocketsEveryMs = opts.numericConstants.checkSocketsEveryMs;
            }
            if(opts.numericConstants.connectionLockTtlMs){
                this.numericConstants.connectionLockTtlMs = opts.numericConstants.connectionLockTtlMs;
            }
            if(opts.numericConstants.messageLockTtlMs){
                this.numericConstants.messageLockTtlMs = opts.numericConstants.messageLockTtlMs;
            }
            if(opts.numericConstants.pairInGameTtlMs){
                this.numericConstants.pairInGameTtlMs = opts.numericConstants.pairInGameTtlMs;
            }
            if(opts.numericConstants.socketTtlMs){
                this.numericConstants.socketTtlMs = opts.numericConstants.socketTtlMs;
            }
            if(opts.numericConstants.timeToProcessMessageMs){
                this.numericConstants.timeToProcessMessageMs = opts.numericConstants.timeToProcessMessageMs;
            }
            if(opts.numericConstants.unpausedGameTtlMs){
                this.numericConstants.unpausedGameTtlMs = opts.numericConstants.unpausedGameTtlMs;
            }
            if(opts.numericConstants.pausedPairTtlMs){
                this.numericConstants.pausedPairTtlMs = opts.numericConstants.pausedPairTtlMs;
            }
            if(opts.numericConstants.pausedTimedoutPairInactivityMs){
                this.numericConstants.pausedTimedoutPairInactivityMs = opts.numericConstants.pausedTimedoutPairInactivityMs;
            }
            if(opts.numericConstants.refreshStatsReloadingMs){
                this.numericConstants.refreshStatsReloadingMs = opts.numericConstants.refreshStatsReloadingMs;
            }
            if(opts.numericConstants.refreshStatsBatchSize){
                this.numericConstants.refreshStatsBatchSize = opts.numericConstants.refreshStatsBatchSize;
            }
            if(opts.numericConstants.refreshOccupationReloadingMs){
                this.numericConstants.refreshOccupationReloadingMs = opts.numericConstants.refreshOccupationReloadingMs;
            }
            if(opts.numericConstants.absoluteMaximumGameplayTtlMs){
                this.numericConstants.absoluteMaximumGameplayTtlMs = opts.numericConstants.absoluteMaximumGameplayTtlMs;
            }
        }

        this._validateIt();
    }
    _validateIt(){
        validate.isIpAddress(this.physicalHost, 'physicalHost');
        try {
            validate.isString(this.displayHost, 'displayHost')
        } catch(err){
            require('../../index.js').getGoblinBase().logsHook.warn(err);
        }
        validate.isBoolean(this.shareIPAddress, 'shareIPAddress');
        validate.isNumber(this.displayPortWs, 'displayPortWs', 1);
        validate.isNumber(this.displayPortWss, 'displayPortWss', 0);
        validate.isNumber(this.physicalPort, 'physicalPort', 1);
        validate.isNumber(this.bindUdpOnPort, 'bindUdpOnPort', 0);
        validate.isUriPrefix(this.apiPrefix, 'apiPrefix');
        validate.isNumber(this.pairsCapacity, 'pairsCapacity', 1);
        validate.isBoolean(this.resendFinalWsMessages, 'resendFinalWsMessages');

        validate.isNumber(this.numericConstants.heartbeatIntervalMs, 'numericConstants.heartbeatIntervalMs', 1);
        validate.isNumber(this.numericConstants.timeToConnectPairMs, 'numericConstants.timeToConnectPairMs', 1);
        validate.isNumber(this.numericConstants.checkSocketsEveryMs, 'numericConstants.checkSocketsEveryMs', 1);
        validate.isNumber(this.numericConstants.connectionLockTtlMs, 'numericConstants.connectionLockTtlMs', 1);
        validate.isNumber(this.numericConstants.messageLockTtlMs, 'numericConstants.messageLockTtlMs', 1);
        validate.isNumber(this.numericConstants.pairInGameTtlMs, 'numericConstants.pairInGameTtlMs', 1);
        validate.isNumber(this.numericConstants.socketTtlMs, 'numericConstants.socketTtlMs', 1);
        validate.isNumber(this.numericConstants.timeToProcessMessageMs, 'numericConstants.timeToProcessMessageMs', 1);
        validate.isNumber(this.numericConstants.unpausedGameTtlMs, 'numericConstants.unpausedGameTtlMs', 1);
        validate.isNumber(this.numericConstants.pausedPairTtlMs, 'numericConstants.pausedPairTtlMs', 1);
        validate.isNumber(this.numericConstants.pausedTimedoutPairInactivityMs, 'numericConstants.pausedTimedoutPairInactivityMs', 1);
        validate.isNumber(this.numericConstants.refreshStatsReloadingMs, 'numericConstants.refreshStatsReloadingMs', 1);
        validate.isNumber(this.numericConstants.refreshStatsBatchSize, 'numericConstants.refreshStatsBatchSize', 1);
        validate.isNumber(this.numericConstants.refreshOccupationReloadingMs, 'numericConstants.refreshOccupationReloadingMs', 1);
        validate.isNumber(this.numericConstants.absoluteMaximumGameplayTtlMs, 'numericConstants.absoluteMaximumGameplayTtlMs', 1);
    }
}

module.exports = PvpConfig;