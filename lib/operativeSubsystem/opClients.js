'use strict';

module.exports = {
    init,
    count,
    getClients,
    getHeaders,
    quitAllClients
};

const RECONNECTION_AFTER_MS = 3000;

const log = require('../../index.js').getGoblinBase().logsHook;

var _ = require('lodash'),
    async = require('async'),
    redisUtils = require('./utils/redisUtils.js'),
    opScripts = require('./opScripts.js'),
    clients = {},
    headers = [];

function init(options, callback) {
    const ALL_POSSIBLE_CLIENTS = [{
        optHeader: 'sessions', stringHeader: 'SessionsClient'
    },{
        optHeader: 'matchmaking', stringHeader: 'MatchmakingClient'
    },{
        optHeader: 'matchmaking', varHeader: 'matchmakingListener', logHeader: 'MatchmakingListenerClient'
    },{
        optHeader: 'records', stringHeader: 'RecordsClient'
    },{
        optHeader: 'pushNotifications', stringHeader: 'PushNotificationsClient'
    },{
        optHeader: 'gameplayRoom', stringHeader: 'GameplayRoomClient'
    },{
        optHeader: 'gameplayRoom', varHeader: 'gameplayRoomListener', logHeader: 'GameplayRoomListenerClient'
    },{
        optHeader: 'simpleGameplay', stringHeader: 'SimpleGameplayClient'
    },{
        optHeader: 'service', stringHeader: 'ServiceClient'
    },{
        optHeader: 'service', varHeader: 'serviceListener', logHeader: 'ServiceListenerClient'
    },{
        optHeader: 'resourceLocker', stringHeader: 'ResourceLockerClient'
    },{
        optHeader: 'resourceLocker', varHeader: 'resourceLockerListener', logHeader: 'ResourceLockerListenerClient'
    },{
        optHeader: 'maintenance', stringHeader: 'MaintenanceClient'
    }];

    var redis = require('redis'),
        reconnectionStrategy = () => RECONNECTION_AFTER_MS;

    function fabricateOperativeClient(clientName, redisInstance){
        var out = {};

        if(clientName && opScripts.getScripts()[clientName]){
            _.each(opScripts.getScripts()[clientName], (v, k) => {
                out[k] = (keys, callback) => redisUtils.callScript(redisInstance, v, keys, callback);
            });
        }
        out.getRedis = () => redisInstance;

        return out;
    }
    function retards(script, keys, callback) {
        var args = [script];
        if (keys) {
            args.push(keys.length);
            args = args.concat(keys);
        } else {
            args.push(0);
        }
        args.push(callback);
        return this.eval.apply(this, args);
    }
    function retardsSha(scriptSha, keys, callback) {
        var args = [scriptSha];
        if (keys) {
            args.push(keys.length);
            args = args.concat(keys);
        } else {
            args.push(0);
        }
        args.push(callback);
        return this.evalsha.apply(this, args);
    }
    function initClient(optHeader, varHeader, stringHeader, logHeader, callback){
        if(!_.isUndefined(options[optHeader]) && _.isUndefined(clients[varHeader || optHeader])){
            options[optHeader].retry_strategy = reconnectionStrategy;
            let client = redis.createClient(options[optHeader]),
                firstTimeConnecting = true;

            client.evalWithArray = retards;
            client.evalshaWithArray = retardsSha;

            var sHeader = stringHeader || logHeader;

            client.on('ready', () => {
                if(firstTimeConnecting){
                    var theThing = fabricateOperativeClient(stringHeader, client);
                    clients[varHeader || optHeader] = theThing;
                    module.exports[`get${sHeader}`] = () => theThing;
                    headers.push(sHeader);
                    callback();
                    firstTimeConnecting = false;
                }
                log.info(`${sHeader} is ready`);
            });
            client.on('connect', () => log.info(`${sHeader} is connected`));
            client.on('reconnecting', () => log.info(`${sHeader} is reconnecting...`));
            client.on('error', () => log.error(`Error on connect to ${sHeader}`));
        } else {
            callback();
        }
    }

    async.parallel(
        ALL_POSSIBLE_CLIENTS.map(e => cb => initClient(e.optHeader, e.varHeader, e.stringHeader, e.logHeader, cb)),
        callback
    );
}

function count(){
    return _.size(clients);
}
function getClients(){
    return _.values(clients);
}
function getHeaders(){
    return headers;
}
function quitAllClients(){
    _.each(clients, v => {
        if(v.getRedis()){
            v.getRedis().quit();
        }
    });
}