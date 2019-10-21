'use strict';

module.exports = {
    initAndRun,
    shutdown,
    clear,
    _getIpAddress,
    _rerunHeartbeat
};

const goblinBase = require('../../../index.js').getGoblinBase(),
    log = goblinBase.logsHook;

const GAMEPLAY_ROOM_FORCE_SHUTDOWN_AFTER_MS = 10000;

const HMAC_SIGN_HEADER = require('../../webMiddleware/hmacValidation.js').HMAC_SIGN_HEADER,
    PLATFORM_PLUS_VERSION_HEADER = require('../../webMiddleware/platformPlusVersionCheck.js').PLATFORM_PLUS_VERSION_HEADER,
    BODY_PARSER_LIMIT_I = 6144,
    WEBSOCKET_MAX_BACKLOG = 512,
    PAIR_ID_SEED = 791052897,
    MAX_UDP_DATAGRAM_SIZE = 1024,
    MAX_INT = 2147483647,
    SOCKET_SEND_OPTS = { compress: false, mask: false, fin: true },
    QUOTA_LIFETIME_MS = 5000,
    BINARY_MESSAGE_ENCODING = 'base64',
    PREINIT_MESSAGE = 'W8 for setup',
    PROHIBIT_RESERVED_NODES = false;

var _ = require('lodash'),
    url = require('url'),
    murmur = require('murmurhash'),
    jsonpack = require('jsonpack'),
    datagram = require('dgram'),
    crc32 = require('crc-32'),
    ObjectID = require('mongodb').ObjectID;

var opClients = require('../../operativeSubsystem/opClients.js'),
    middleware = require('./middleware.js'),
    gameplayRoomMetrics = require('./gameplayRoomMetrics.js'),
    platformPlusVersionCheck = require('../../webMiddleware/platformPlusVersionCheck.js'),
    hmacValidation = require('../../webMiddleware/hmacValidation.js'),
    CF_EntryPoint = require('../cloudFunctions/CF_EntryPoint.js');

var ErrorResponse = require('../../objects/ErrorResponse.js');

var PvpConnectionHandler = require('../cloudFunctions/CF_Classes.js').PvpConnectionHandler;

var Profile = require('../../persistenceSubsystem/dao/profile.js'),
    BattleModel = require('../../persistenceSubsystem/dao/battle.js'),
    BattleCounter = require('../../persistenceSubsystem/dao/sequenceCounter.js');

var heartbeatIntervalMs = goblinBase.pvpConfig.numericConstants.heartbeatIntervalMs,
    timeToConnectPairMs = goblinBase.pvpConfig.numericConstants.timeToConnectPairMs,
    checkSocketsEveryMs = goblinBase.pvpConfig.numericConstants.checkSocketsEveryMs,
    connectionLockTtlMs = goblinBase.pvpConfig.numericConstants.connectionLockTtlMs,
    messageLockTtlMs = goblinBase.pvpConfig.numericConstants.messageLockTtlMs,
    pairInGameTtlMs = goblinBase.pvpConfig.numericConstants.pairInGameTtlMs,
    socketTtlMs = goblinBase.pvpConfig.numericConstants.socketTtlMs,
    timeToProcessMessageMs = goblinBase.pvpConfig.numericConstants.timeToProcessMessageMs,
    unpausedGameTtlMs = goblinBase.pvpConfig.numericConstants.unpausedGameTtlMs,
    pausedPairTtlMs = goblinBase.pvpConfig.numericConstants.pausedPairTtlMs,
    pausedTimedoutPairInactivityMs = goblinBase.pvpConfig.numericConstants.pausedTimedoutPairInactivityMs,
    refreshStatsReloadingMs = goblinBase.pvpConfig.numericConstants.refreshStatsReloadingMs,
    refreshStatsBatchSize = goblinBase.pvpConfig.numericConstants.refreshStatsBatchSize,
    refreshOccupationReloadingMs = goblinBase.pvpConfig.numericConstants.refreshOccupationReloadingMs,
    gameroomBookingTtl = goblinBase.matchmakingConfig.numericConstants.gameroomBookingTtl,
    playerInGameroomTtl = goblinBase.matchmakingConfig.numericConstants.playerInGameroomTtl,
    resendFinalWsMessages = goblinBase.pvpConfig.resendFinalWsMessages,
    roomTtlIndexMs = goblinBase.matchmakingConfig.numericConstants.refreshStatsReloadingMs * 3,
    absoluteMaximumGameplayTtlMs = goblinBase.pvpConfig.numericConstants.absoluteMaximumGameplayTtlMs;

var opSubscriber,
    hosts, ports,
    ipAddress,
    server,
    udpServer,
    heartbeatInterval;

var wsConnections = {},
    socketsCheckLastTs = 0;

const CHANNEL_NAME = 'gr-pub';

function initAndRun(callback){
    var wss, roomOccupation;

    function initSubscriber(){
        opSubscriber = opClients.getGameplayRoomListenerClient();
        opSubscriber.getRedis().on('message', opHandleMessage);
        opSubscriber.getRedis().subscribe(CHANNEL_NAME);

        initServer();
    }
    function initServer(){
        var app = require('fastify')({ logger: false }),
            ws = require('ws');

        function preConfigure(){
            if(goblinBase.cors){
                app.register(require('fastify-cors'), goblinBase.cors);
            }

            hosts = {};

            if(goblinBase.pvpConfig.shareIPAddress){
                hosts.asIP = require('ip').address();
            }
            if(goblinBase.pvpConfig.displayHost){
                hosts.asDomain = goblinBase.pvpConfig.displayHost;
            }

            ports = {};

            if(!goblinBase.pvpConfig.displayPortWs && !goblinBase.pvpConfig.displayPortWss){
                ports.ws = goblinBase.pvpConfig.physicalPort;
            } else {
                if(goblinBase.pvpConfig.displayPortWss){
                    ports.wss = goblinBase.pvpConfig.displayPortWss;
                }
                if(goblinBase.pvpConfig.displayPortWs){
                    ports.ws = goblinBase.pvpConfig.displayPortWs;
                }
            }
            if(goblinBase.pvpConfig.bindUdpOnPort){
                ports.dgram = goblinBase.pvpConfig.bindUdpOnPort;
            }

            ipAddress = JSON.stringify({ hosts, ports });

            configureRoutes();
        }
        function configureRoutes(){
            const GET = 'GET',
                POST = 'POST';

            var bodyIsTheMust = require('../../webMiddleware/sometimesBodyIsTheMust.js');

            app.route({
                method: POST,
                url: `/${goblinBase.pvpConfig.apiPrefix}releaseBooking`,
                bodyLimit: BODY_PARSER_LIMIT_I,
                preHandler: [
                    bodyIsTheMust, platformPlusVersionCheck.doCheck,
                    middleware.checkTheBooking(ipAddress, gameroomBookingTtl),
                    middleware.tryToAcquireLock(false, messageLockTtlMs),
                    hmacValidation.doGameroomHmacCheckMiddleware
                ],
                handler: releaseBooking
            });

            app.route({
                method: POST,
                url: `/${goblinBase.pvpConfig.apiPrefix}setPayload`,
                bodyLimit: BODY_PARSER_LIMIT_I,
                preHandler: [
                    bodyIsTheMust, platformPlusVersionCheck.doCheck,
                    middleware.tryToAcquireLock(true, messageLockTtlMs),
                    hmacValidation.doGameroomHmacCheckMiddleware
                ],
                handler: setPayload
            });

            app.route({
                method: POST,
                url: `/${goblinBase.pvpConfig.apiPrefix}setReady`,
                bodyLimit: BODY_PARSER_LIMIT_I,
                preHandler: [
                    bodyIsTheMust, platformPlusVersionCheck.doCheck,
                    middleware.tryToAcquireLock(true, messageLockTtlMs),
                    hmacValidation.doGameroomHmacCheckMiddleware
                ],
                handler: setReady
            });

            app.route({
                method: POST,
                url: `/${goblinBase.pvpConfig.apiPrefix}surrender`,
                bodyLimit: BODY_PARSER_LIMIT_I,
                preHandler: [
                    bodyIsTheMust, platformPlusVersionCheck.doCheck,
                    hmacValidation.doGameroomHmacCheckMiddleware
                ],
                handler: surrender
            });

            app.route({
                method: GET,
                url: `/${goblinBase.pvpConfig.apiPrefix}utils.getServerTime`,
                handler: (__, res) => res.send(`${_.now()}`)
            });
            app.route({
                method: GET,
                url: `/${goblinBase.pvpConfig.apiPrefix}utils.getSequence`,
                preHandler: [
                    platformPlusVersionCheck.doCheck,
                    middleware.tryToAcquireLock(true, messageLockTtlMs)
                ],
                handler: getCurrentSequence
            });
            app.route({
                method: GET,
                url: `/${goblinBase.pvpConfig.apiPrefix}utils.getTurnSequence`,
                preHandler: [
                    platformPlusVersionCheck.doCheck,
                    middleware.tryToAcquireLock(true, messageLockTtlMs),
                    hmacValidation.doGameroomHmacCheckMiddleware
                ],
                handler: getCurrentTurnSequence
            });

            var pingMe = (__, res) => res.code(200).send(`This game room is okay and placed at ${hosts.asDomain || hosts.asIP}`);

            app.route({ method: GET, url: `/${goblinBase.pvpConfig.apiPrefix}`, handler: pingMe });
            app.route({ method: GET, url: `/`, handler: pingMe });

            andRun();
        }
        function andRun(){
            app.listen(goblinBase.pvpConfig.physicalPort, goblinBase.pvpConfig.physicalHost, (err, address) => {
                server = app.server;
                if(err){
                    log.fatal(`Goblin Base gameplay room won't run: ${err.message}`);
                } else {
                    log.info(`Gameroom web api server start on ${address}`);
                }
            });
            try{
                wss = new ws.Server({ server: app.server, backlog: WEBSOCKET_MAX_BACKLOG, maxPayload: BODY_PARSER_LIMIT_I });
            } catch(err){
                log.fatal(err);
            }

            addListeners();
        }

        preConfigure();
    }
    function addListeners(){
        wss.on('connection', (theWs, req) => incomingConnection(theWs, req));
        wss.on('error', err => log.error(err));
        wss.on('listening', () => {
            log.info(`Gameroom websocket server start on host ${goblinBase.pvpConfig.physicalHost} and port ${goblinBase.pvpConfig.physicalPort}`);
            log.info(`Gameroom hosts: ${JSON.stringify(hosts)}`);
            log.info(`Gameroom capacity: ${goblinBase.pvpConfig.pairsCapacity} pairs = ${goblinBase.pvpConfig.pairsCapacity * 2} real players`);
            acquireLockForAddingRoom();
        });
        if(goblinBase.pvpConfig.bindUdpOnPort){
            tryToBindUdp();
        }
    }
    function tryToBindUdp(){
        if(goblinBase.pvpConfig.bindUdpOnPort){
            let amp = require('amp');

            udpServer = datagram.createSocket('udp4');
            udpServer.on('message', (dgram, info) => {
                if(info.size <= MAX_UDP_DATAGRAM_SIZE){
                    let messageDecoded = amp.decode(dgram);
                    if(messageDecoded.length === 2 && messageDecoded[0]){
                        handleDatagram(messageDecoded[0], messageDecoded[1], info.address, info.port);
                    }
                }
            });
            udpServer.on('error', err => {
                log.fatal(`Game room udp failed to bind:`);
                log.fatal(err);
                setTimeout(tryToBindUdp, 5000);
            });
            udpServer.on('listening', () => {
                log.info(`Game room udp bind on: ${udpServer.address().address}:${udpServer.address().port}`);
            });
            try{
                udpServer.bind(goblinBase.pvpConfig.bindUdpOnPort);
            } catch(err){
                log.fatal(err);
            }
        }
    }
    function acquireLockForAddingRoom(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 340, err: { code: err.code, command: err.command, message: err.message } });
                callback(err);
            } else if(response && response === '1'){
                getThisRoomOccupation();
            } else {
                callback(null);
            }
        };

        opClients.getGameplayRoomClient().acquireLockToAddRoom([], callbackFn);
    }
    function getThisRoomOccupation(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 341, err: { code: err.code, command: err.command, message: err.message } });
                callback(err);
            } else {
                roomOccupation = +response;
                addRoomToMm();
            }
        };

        opClients.getGameplayRoomClient().getOccupation([goblinBase.pvpConfig.pairsCapacity], callbackFn);
    }
    function addRoomToMm(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 342, err: { code: err.code, command: err.command, message: err.message } });
                callback(err);
            } else {
                heartbeatInterval = setInterval(theHeartbeat, heartbeatIntervalMs);
                callback(null);
            }
        };

        opClients.getMatchmakingClient().updateRoomOccupation([ipAddress, roomTtlIndexMs, '-1', roomOccupation], callbackFn);
    }

    initSubscriber();
}
function theHeartbeat(){
    var now = _.now(), theOccupationToUpdate;

    function tryToCheckConnections(){
        if(socketsCheckLastTs + checkSocketsEveryMs < now){
            socketsCheckLastTs = now;
            _.each(wsConnections, (v, k) => {
                if(v.lastCheck + socketTtlMs < now){
                    v.sock.removeAllListeners('message');
                    if(v.sock.readyState < 3){
                        v.sock.terminate();
                    }
                    delete wsConnections[k];
                }
            });
        }
        refreshStats();
    }
    function refreshStats(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 343, err: { code: err.code, command: err.command, message: err.message } });
            }
            if(response && response.startsWith('1;')){
                theOccupationToUpdate = +(response.split(';')[1]);
                justIncrementOccupation();
            } else {
                getOccupationToRefreshIt();
            }
        };

        opClients.getGameplayRoomClient().refreshStats([
            refreshStatsBatchSize,
            refreshStatsReloadingMs,
            timeToConnectPairMs,
            pairInGameTtlMs,
            pausedPairTtlMs,
            absoluteMaximumGameplayTtlMs,
            now, -1,
            QUOTA_LIFETIME_MS,
            goblinBase.pvpConfig.pairsCapacity
        ], callbackFn);
    }
    function justIncrementOccupation(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 557, err: { code: err.code, command: err.command, message: err.message } });
            }
            doMetrics();
        };

        opClients.getMatchmakingClient().updateRoomOccupation([ipAddress, roomTtlIndexMs, '-1', theOccupationToUpdate], callbackFn);
    }
    function getOccupationToRefreshIt(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 559, err: { code: err.code, command: err.command, message: err.message } });
            } else if(response){
                theOccupationToUpdate = parseInt(response);
                doRefreshOccupation();
            }
        };

        opClients.getGameplayRoomClient().getOccupationToRefreshIt([now, refreshOccupationReloadingMs], callbackFn);
    }
    function doRefreshOccupation(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 560, err: { code: err.code, command: err.command, message: err.message } });
            }
            doMetrics();
        };

        opClients.getMatchmakingClient().updateRoomOccupation([ipAddress, roomTtlIndexMs, '-1', theOccupationToUpdate], callbackFn);
    }
    function doMetrics(){
        gameplayRoomMetrics.metricsTick(_.size(wsConnections), _.noop);
    }

    tryToCheckConnections();
}

function releaseBooking(req, res){
    var now = _.now(),
        hid, opponentHid, botOpponentPayload,
        roomOccupationToUpdate;

    function checkArgs() {
        if(!req.bookingKey){
            res.code(400).send(new ErrorResponse(607, 'No booking key'));
        } else {
            getAnHumanIds();
        }
    }
    function getAnHumanIds(){
        let callbackFn = (err, docs) => {
            if(err){
                log.error('Database Error', { code: 921, err: { code: err.code, command: err.command, message: err.message } });
                unlockAndResponse(500, new ErrorResponse(921, 'Database Error'));
            } else {
                _.each(docs, d => {
                    var _pid = d._id.toString();
                    if(_pid === req.pid){
                        hid = d.humanId;
                    }
                    if(_pid === req.opponentPid){
                        opponentHid = d.humanId;
                    }
                });
                doRefreshStats();
            }
        };

        Profile.find(
            { $or: [{ _id: new ObjectID(req.pid) }, { _id: new ObjectID(req.opponentPid) }] },
            { projection: { _id: 1, humanId: 1 } }
        ).toArray(callbackFn);
    }
    function doRefreshStats(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 1056, err: { code: err.code, command: err.command, message: err.message } });
                unlockAndResponse(500, new ErrorResponse(1056, 'OP Error'));
            } else if(response && response.startsWith('1;')){
                roomOccupationToUpdate = +(response.split(';')[1]);
                justIncrementOccupation();
            } else {
                updatePlayerInGameroom();
            }
        };

        opClients.getGameplayRoomClient().refreshStats([
            refreshStatsBatchSize,
            refreshStatsReloadingMs,
            timeToConnectPairMs,
            pairInGameTtlMs,
            pausedPairTtlMs,
            absoluteMaximumGameplayTtlMs,
            now, req.bookingKey,
            QUOTA_LIFETIME_MS,
            goblinBase.pvpConfig.pairsCapacity
        ], callbackFn);
    }
    function justIncrementOccupation(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 1057, err: { code: err.code, command: err.command, message: err.message } });
            }
            updatePlayerInGameroom();
        };

        opClients.getMatchmakingClient().updateRoomOccupation([ipAddress, roomTtlIndexMs, '-1', roomOccupationToUpdate], callbackFn);
    }
    function updatePlayerInGameroom(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 489, err: { code: err.code, command: err.command, message: err.message } });
                unlockAndResponse(500, new ErrorResponse(489, 'OP Error'));
            } else if(response){
                makeBotPayload();
            } else {
                unlockAndResponse(400, new ErrorResponse(410, 'Not in game'));
            }
        };

        opClients.getMatchmakingClient().updatePlayerIsInGameroom([req.pid, now, playerInGameroomTtl, req.bookingKey], callbackFn);
    }
    function makeBotPayload(){
        if(req.opponentIsBot){
            let callbackFn = (err, response) => {
                if(err){
                    unlockAndResponse(500, err);
                } else {
                    botOpponentPayload = response && response.responseObject
                        ? jsonpack.pack(response.responseObject)
                        : '-1';
                    placeInRoom();
                }
            };

            req.botOpponentProfileData = (req.botOpponentProfileData === '-1' || req.botOpponentProfileData == null)
                ? req.botOpponentProfileData
                : jsonpack.unpack(req.botOpponentProfileData);

            CF_EntryPoint.pvpGeneratePayload(now, opponentHid, req.botOpponentProfileData, false, true, undefined, callbackFn);
        } else {
            botOpponentPayload = '-1';
            placeInRoom();
        }
    }
    function placeInRoom(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 348, err: { code: err.code, command: err.command, message: err.message } });
                unlockAndResponse(500, new ErrorResponse(348, 'OP Error'));
            } else if(response){
                if(response === '1'){
                    unlockAndResponse(200, { c: 0, m: 'GR: pair allocated. Wait for opponent' });
                } else if(response === '2'){
                    unlockAndResponse(200, { c: 1, m: 'GR: pair formed' });
                }
            } else {
                unlockAndResponse(400, new ErrorResponse(349, 'Didn\'t found pair'));
            }
        };

        var pairId = murmur.v3(req.bookingKey, PAIR_ID_SEED).toString(32);
        opClients.getGameplayRoomClient().placePlayerInRoom([
            pairId, req.pid, req.opponentPid, hid, opponentHid,
            req.bookingKey, timeToConnectPairMs, now, botOpponentPayload,
        ], callbackFn);
    }
    function unlockAndResponse(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 350, err: { code: err.code, command: err.command, message: err.message } });
                res.code(500).send(new ErrorResponse(350, 'OP Error'));
            } else if(response){
                res.code(code).send(response);
            } else {
                res.code(code).end();
            }
        };

        opClients.getGameplayRoomClient().getRedis().del(`hloc:${req.bookingKey}`, callbackFn);
    }

    checkArgs();
}
function setPayload(req, res){
    var now = _.now(),
        playerIsA, playerHumanId, playerPayload,
        roomOccupationToUpdate;

    function updatePlayerInGameroom(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 411, err: { code: err.code, command: err.command, message: err.message } });
                unlockAndResponse(500, new ErrorResponse(411, 'OP Error'));
            } else if(response){
                getPlayerHumanId();
            } else {
                unlockAndResponse(400, new ErrorResponse(412, 'Not in game'));
            }
        };

        opClients.getMatchmakingClient().updatePlayerIsInGameroom([req.pid, now, playerInGameroomTtl, req.bookingKey], callbackFn);
    }
    function getPlayerHumanId(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 612, err: { code: err.code, command: err.command, message: err.message } });
                unlockAndResponse(500, new ErrorResponse(612, 'OP Error'));
            } else if(response){
                [playerIsA, playerHumanId] = response.split(';');
                playerIsA = !!+playerIsA;
                playerHumanId = +playerHumanId;
                doRefreshStats();
            } else {
                unlockAndResponse(400, new ErrorResponse(613, 'Not in game'));
            }
        };

        opClients.getGameplayRoomClient().getPlayerHumanId([req.pid], callbackFn);
    }
    function doRefreshStats(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 1058, err: { code: err.code, command: err.command, message: err.message } });
                unlockAndResponse(500, new ErrorResponse(1058, 'OP Error'));
            } else if(response && response.startsWith('1;')){
                roomOccupationToUpdate = +(response.split(';')[1]);
                justIncrementOccupation();
            } else {
                makePayload();
            }
        };

        opClients.getGameplayRoomClient().refreshStats([
            refreshStatsBatchSize,
            refreshStatsReloadingMs,
            timeToConnectPairMs,
            pairInGameTtlMs,
            pausedPairTtlMs,
            absoluteMaximumGameplayTtlMs,
            now, req.bookingKey,
            QUOTA_LIFETIME_MS,
            goblinBase.pvpConfig.pairsCapacity
        ], callbackFn);
    }
    function justIncrementOccupation(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 1059, err: { code: err.code, command: err.command, message: err.message } });
            }
            makePayload();
        };

        opClients.getMatchmakingClient().updateRoomOccupation([ipAddress, roomTtlIndexMs, roomOccupationToUpdate], callbackFn);
    }
    function makePayload(){
        if(CF_EntryPoint.checkPvpGeneratePayloadPresence()){
            let callbackFn = (err, response) => {
                if(err){
                    unlockAndResponse(500, err);
                } else {
                    playerPayload = response && response.responseObject
                        ? jsonpack.pack(response.responseObject)
                        : '-1';
                    doSetPayload();
                }
            };

            CF_EntryPoint.pvpGeneratePayload(
                now, playerHumanId, _.isPlainObject(req.body) ? req.body : undefined, playerIsA, false, req.body,
                callbackFn
            );
        } else if(_.isPlainObject(req.body)){
            playerPayload = jsonpack.pack(req.body);
            doSetPayload();
        } else {
            unlockAndResponse(400, new ErrorResponse(614, 'Invalid payload'));
        }
    }
    function doSetPayload(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 353, err: { code: err.code, command: err.command, message: err.message } });
                unlockAndResponse(500, new ErrorResponse(353, 'OP Error'));
            } else if(response){
                if(response === '1'){
                    unlockAndResponse(200, { c: 1, m: 'GR: payload set' });
                } else if(response === '2'){
                    unlockAndResponse(200, { c: 2, m: 'GR: set ready' });
                }
            } else {
                unlockAndResponse(400, new ErrorResponse(354, 'Didn\'t found pair'));
            }
        };

        opClients.getGameplayRoomClient().setPayload([req.bookingKey, timeToConnectPairMs, now, playerPayload], callbackFn);
    }
    function unlockAndResponse(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 355, err: { code: err.code, command: err.command, message: err.message } });
                res.code(500).send(new ErrorResponse(355, 'OP Error'));
            } else if(response){
                res.code(code).send(response);
            } else {
                res.code(code).end();
            }
        };

        opClients.getGameplayRoomClient().getRedis().del(`hloc:${req.bookingKey}`, callbackFn);
    }

    updatePlayerInGameroom();
}
function setReady(req, res){
    var now = _.now(),
        pid = req.pid, pairId, isPlayerA, pidA, pidB, payloadA, payloadB, opponentPayload, gameplayModel,
        roomOccupationToUpdate;

    function updatePlayerInGameroom(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 561, err: { code: err.code, command: err.command, message: err.message } });
                unlockAndResponse(500, new ErrorResponse(561, 'OP Error'));
            } else if(response){
                doRefreshStats();
            } else {
                unlockAndResponse(400, new ErrorResponse(562, 'Not in game'));
            }
        };

        opClients.getMatchmakingClient().updatePlayerIsInGameroom([pid, now, playerInGameroomTtl, req.bookingKey], callbackFn);
    }
    function doRefreshStats(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 1060, err: { code: err.code, command: err.command, message: err.message } });
                unlockAndResponse(500, new ErrorResponse(1060, 'OP Error'));
            } else if(response && response.startsWith('1;')){
                roomOccupationToUpdate = +(response.split(';')[1]);
                justIncrementOccupation();
            } else {
                doSetReady();
            }
        };

        opClients.getGameplayRoomClient().refreshStats([
            refreshStatsBatchSize,
            refreshStatsReloadingMs,
            timeToConnectPairMs,
            pairInGameTtlMs,
            pausedPairTtlMs,
            absoluteMaximumGameplayTtlMs,
            now, req.bookingKey,
            QUOTA_LIFETIME_MS,
            goblinBase.pvpConfig.pairsCapacity
        ], callbackFn);
    }
    function justIncrementOccupation(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 1061, err: { code: err.code, command: err.command, message: err.message } });
            }
            doSetReady();
        };

        opClients.getMatchmakingClient().updateRoomOccupation([ipAddress, roomTtlIndexMs, '-1', roomOccupationToUpdate], callbackFn);
    }
    function doSetReady(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 358, err: { code: err.code, command: err.command, message: err.message } });
                unlockAndResponse(500, new ErrorResponse(358, 'OP Error'));
            } else if(response){
                if(response.startsWith('1;')){
                    let [__, opponentPayload] = response.split(';'),
                        payloadPacked = opponentPayload,
                        thePayloadField = payloadPacked === '-1' ? null : jsonpack.unpack(payloadPacked);
                    unlockAndResponse(200, { c: 2, m: 'GR: waiting opponent', oppPayload: thePayloadField });
                } else if(response.startsWith('2;')){
                    let prefixAndPairIdAndIsA = response.split(';');
                    pairId = prefixAndPairIdAndIsA[1];
                    isPlayerA = prefixAndPairIdAndIsA[2] === '1';
                    getPayloads();
                }
            } else {
                unlockAndResponse(400, new ErrorResponse(359, 'Didn\'t found pair'));
            }
        };

        opClients.getGameplayRoomClient().setReady([req.bookingKey, timeToConnectPairMs, now], callbackFn);
    }
    function getPayloads(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 360, err: { code: err.code, command: err.command, message: err.message } });
                unlockAndResponse(500, new ErrorResponse(360, 'OP Error'));
            } else {
                payloadA = jsonpack.unpack(response[0]);
                payloadB = response[1] ? jsonpack.unpack(response[1]) : null;
                pidA = response[2];
                pidB = response[3];
                opponentPayload = isPlayerA ? payloadB : payloadA;
                doInitGameplayModel();
            }
        };

        opClients.getGameplayRoomClient().getRedis().hmget(`pair:${pairId}`, 'plda', 'pldb', 'pida', 'pidb', callbackFn);
    }
    function doInitGameplayModel(){
        let callbackFn = (err, response) => {
            if(err){
                unlockAndResponse(500, err);
            } else {
                if(response && response.responseObject){
                    gameplayModel = { startTs: now, randomSeed, model: response.responseObject };
                }
                whatsNextWithModel();
            }
        };

        var randomSeed = _.random(1, 2147483647);
        CF_EntryPoint.pvpInitGameplayModel(now, pidA, pidB, payloadA, payloadB, randomSeed, callbackFn);
    }
    function whatsNextWithModel(){
        if(gameplayModel){
            setGameplayModel();
        } else {
            abandonPair();
        }
    }
    function abandonPair(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 361, err: { code: err.code, command: err.command, message: err.message } });
                unlockAndResponse(500, new ErrorResponse(361, 'OP Error'));
            } else {
                unlockAndResponse(400, { c: -1, m: 'GR: failed to init gameplay model' });
            }
        };

        opClients.getGameplayRoomClient().abandonPairGameplay([req.bookingKey], callbackFn);
    }
    function setGameplayModel(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 362, err: { code: err.code, command: err.command, message: err.message } });
                unlockAndResponse(500, new ErrorResponse(362, 'OP Error'));
            } else if(response && response === '1'){
                tryToSwapSocketMessageListener();
            } else {
                unlockAndResponse(400, new ErrorResponse(363, 'Didn\'t found pair'));
            }
        };

        opClients.getGameplayRoomClient().setGameplayModel([
            req.bookingKey, timeToConnectPairMs,
            now, jsonpack.pack(gameplayModel),
            gameplayModel.startTs, gameplayModel.randomSeed
        ], callbackFn);
    }
    function tryToSwapSocketMessageListener(){
        var con = wsConnections[pid];

        if(con && con.lastCheck + socketTtlMs > _.now()){
            con.sock.removeListener('message', con.msgCallback);
            con.msgCallback = msg => socketOnMessage(con, msg);
            con.sock.on('message', con.msgCallback);
        }

        unlockAndResponse(200, {
            p: 4, c: 3, m: 'GR: gameplay model established',
            oppPayload: opponentPayload,
            startTs: gameplayModel.startTs,
            randomSeed: gameplayModel.randomSeed,
            isA: +isPlayerA
        });
    }
    function unlockAndResponse(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 364, err: { code: err.code, command: err.command, message: err.message } });
                res.code(500).send(new ErrorResponse(364, 'OP Error'));
            } else if(response){
                res.code(code).send(response);
            } else {
                res.code(code).end();
            }
        };

        opClients.getGameplayRoomClient().getRedis().del(`hloc:${req.bookingKey}`, callbackFn);
    }

    updatePlayerInGameroom();
}
function surrender(req, res){
    function doSurrender(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 583, err: { code: err.code, command: err.command, message: err.message } });
                res.code(500).send(new ErrorResponse(583, 'OP Error'));
            } else if(response){
                justIncrementOccupation();
            } else {
                res.code(400).send(new ErrorResponse(584, 'Pair not found or cannot surrender'));
            }
        };

        opClients.getGameplayRoomClient().doSurrender([req.bookingKey, QUOTA_LIFETIME_MS], callbackFn);
    }
    function justIncrementOccupation(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 585, err: { code: err.code, command: err.command, message: err.message } });
            }
            res.code(200).send();
        };

        opClients.getMatchmakingClient().updateRoomOccupation([ipAddress, roomTtlIndexMs, 1], callbackFn);
    }

    doSurrender();
}
function getCurrentSequence(req, res){
    function doGet(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 1062, err: { code: err.code, command: err.command, message: err.message } });
                unlockAndResponse(500, new ErrorResponse(1062, 'OP Error'));
            } else if(response){
                unlockAndResponse(200, { sequence: _.parseIntOrNull(response) });
            } else {
                unlockAndResponse(400, new ErrorResponse(616, 'Don\'t know you'));
            }
        };

        opClients.getGameplayRoomClient().getCurrentSequenceValue([req.bookingKey], callbackFn);
    }
    function unlockAndResponse(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 1063, err: { code: err.code, command: err.command, message: err.message } });
                res.code(500).send(new ErrorResponse(1063, 'OP Error'));
            } else if(response){
                res.code(code).send(response);
            } else {
                res.code(code).end();
            }
        };

        opClients.getGameplayRoomClient().getRedis().del(`hloc:${req.bookingKey}`, callbackFn);
    }

    doGet();
}
function getCurrentTurnSequence(req, res){
    function doGet(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 1064, err: { code: err.code, command: err.command, message: err.message } });
                unlockAndResponse(500, new ErrorResponse(1064, 'OP Error'));
            } else if(response){
                unlockAndResponse(200, { sequence: _.parseIntOrNull(response) });
            } else {
                unlockAndResponse(400, new ErrorResponse(1065, 'Don\'t know you'));
            }
        };

        opClients.getGameplayRoomClient().getTurnSequenceValue([req.bookingKey], callbackFn);
    }
    function unlockAndResponse(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 1066, err: { code: err.code, command: err.command, message: err.message } });
                res.code(500).send(new ErrorResponse(1066, 'OP Error'));
            } else if(response){
                res.code(code).send(response);
            } else {
                res.code(code).end();
            }
        };

        opClients.getGameplayRoomClient().getRedis().del(`hloc:${req.bookingKey}`, callbackFn);
    }

    doGet();
}

function handleDatagram(bookingKey, message, fromAddress, fromPort){
    bookingKey = String(bookingKey);

    if(bookingKey){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 639, err: { code: err.code, command: err.command, message: err.message } });
            } else if(response){
                let opponentHostAndPort = response.split(',');
                udpServer.send(message, parseInt(opponentHostAndPort[1]), opponentHostAndPort[0]);
            }
        };

        opClients.getGameplayRoomClient().tryToGetOpponentDatagramAddress([bookingKey, fromAddress, fromPort], callbackFn);
    }
}
function opHandleMessage(ch, msg){
    var now = _.now(), pid, pairId;

    function handleSysMessage(){
        if(msg.startsWith('1;')){
            fetchPairPlayerMessage();
        } else if(msg.startsWith('2;')){
            writeAutoDefeat(msg.slice(2));
        } else if(msg.startsWith('3;')){
            broadcastBitwiseBattleMessage(msg.slice(2));
        } else if(msg.startsWith('4;')){
            broadcastBitwiseFinalMessageAndFinalizeBattle(msg.slice(2));
        }
    }
    function fetchPairPlayerMessage(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 365, err: { code: err.code, command: err.command, message: err.message } });
            } else if(response){
                response = jsonpack.unpack(response);
                let receiverPid = response.receiverPid;
                delete response.senderPid;
                delete response.receiverPid;
                processPairMessage(pairId, now, receiverPid, response);
            }
        };

        var prefixAndPairId = msg.split(';');
        pairId = prefixAndPairId[1];
        opClients.getGameplayRoomClient().fetchQueueMessage([
            pairId,
            pairInGameTtlMs,
            timeToProcessMessageMs, pausedPairTtlMs,
            absoluteMaximumGameplayTtlMs, now
        ], callbackFn);
    }
    function processPidMessage() {
        if (msg === '1' || msg === '3') {
            sendProgress(msg);
        } else if (msg.startsWith('2;')) {
            sendProgressPayloadsSet(msg);
        } else if (msg.startsWith('4;')) {
            sendGameStart(msg);
        } else if (msg.startsWith('5;')) {
            msg = msg.slice(2);
            let isPaused = +msg[0];
            msg = msg.slice(2);
            let inx = msg.indexOf(';'),
                playerTurn = _.parseIntOrNull(msg.slice(0, inx));
            msg = jsonpack.unpack(msg.slice(inx + 1));
            let pauseFrom = isPaused ? msg.now : msg.fromTs,
                pauseTo = isPaused ? undefined : msg.now;
            sendByPid(pid, _.now(), { p: 4, c: 3, m: msg.mts, paused: +isPaused, turn: playerTurn, from: pauseFrom, to: pauseTo }, false, false);
        } else if (msg.startsWith('6;')) {
            sendByPid(pid, _.now(), jsonpack.unpack(msg.slice(2)), true, false);
        } else if (msg.startsWith('7;')) {
            sendByPid(pid, _.now(), jsonpack.unpack(msg.slice(2)), false, true);
        } else if (msg.startsWith('8;')) {
            let [turn, msgNow] = msg.slice(2).split(';');
            sendByPid(pid, _.now(), { p: 4, c: 3, m: 'GR: opponent disconnected', paused: 1, turn: _.parseIntOrNull(turn), from: _.parseIntOrNull(msgNow) }, false, false);
        } else if (msg.startsWith('9;')) {
            let [__, player, paused, targetPlayerTurn, msgNow, pausedFromTs] = msg.split(';');
            sendByPid(pid, _.now(), {
                p: 4, c: 3,
                m: 'GR: opponent connected',
                isA: _.parseIntOrNull(player),
                paused: _.parseIntOrNull(paused),
                turn: _.parseIntOrNull(targetPlayerTurn),
                from: +pausedFromTs || undefined,
                to: _.parseIntOrNull(msgNow)
            }, false, false);
        } else if (msg === '10') {
            clearMatchmakingAndSendMessage(pid, undefined, { c: -1, m: 'GR: pair dead or ttl is out' });
        } else if (msg.startsWith('11;')) {
            clearMatchmakingAndSendMessage(pid, undefined, jsonpack.unpack(msg.slice(3)));
        } else if (msg.startsWith('12;')) {
            let [__, quid] = msg.split(';');
            sendByPid(pid, _.now(), { m: 'GR: force closed con' }, true, true, quid);
        } else if (msg.startsWith('13;')) {
            sendByPid(pid, _.now(), jsonpack.unpack(msg.slice(3)), true, true);
        } else if (msg.startsWith('14;')) {
            sendByPid(pid, _.now(), msg.slice(5), false, false, null, msg.startsWith('14;1;'));
        }
    }
    function sendProgress(theProgress){
        if(wsConnections){
            let con = wsConnections[pid];
            if(con && con.lastCheck + socketTtlMs > _.now()){
                if(theProgress === '1'){
                    con.sock.send({ p: 1, m: 'PRGS: all players connected' }, SOCKET_SEND_OPTS);
                } else if(theProgress === '3'){
                    con.sock.send({ p: 3, m: 'PRGS: all players ready' }, SOCKET_SEND_OPTS);
                }
            }
        }
    }
    function sendProgressPayloadsSet(msg){
        if(wsConnections){
            let con = wsConnections[pid];
            if(con && con.lastCheck + socketTtlMs > _.now()){
                let isA = msg.split(';')[1],
                    isAAndOppPayload = isA.split(',');

                con.sock.send({
                    p: 2, m: 'PRGS: all payloads set',
                    isA: !!+isAAndOppPayload[0], oppPayload: jsonpack.unpack(isAAndOppPayload[1])
                }, SOCKET_SEND_OPTS);
            }
        }
    }
    function sendGameStart(theMsg){
        var con = wsConnections[pid];

        if(con && con.lastCheck + socketTtlMs > _.now()){
            con.sock.removeListener('message', con.msgCallback);
            con.msgCallback = msg => socketOnMessage(con, msg);
            con.sock.on('message', con.msgCallback);

            let [__, opponentPayload, startTs, randomSeed, isPlayerA] = theMsg.split(';');
            opponentPayload = jsonpack.unpack(opponentPayload);
            con.sock.send({
                p: 4, c: 3, m: 'GR: gameplay model established',
                oppPayload: opponentPayload,
                startTs: +startTs,
                randomSeed: +randomSeed,
                isA: +isPlayerA
            }, SOCKET_SEND_OPTS);
        }
    }
    function clearMatchmakingAndSendMessage(pid, now, message){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 152, err: { code: err.code, command: err.command, message: err.message } });
            }
            sendByPid(pid, now || _.now(), message, true, false);
        };

        opClients.getMatchmakingClient().removeQplrAndGmrb([pid], callbackFn);
    }
    function writeAutoDefeat(message){
        var now,
            metaAndPairId = message.split(';;'),
            pidsAndLags, opponentIsBot, lagA, lagB, theModel, pidA, pidB,
            humanIdA, humanIdB, finalMessages;

        function doTryToRedeemQuota(){
            let callbackFn = (err, response) => {
                if(err){
                    log.error('OP Error', { code: 617, err: { code: err.code, command: err.command, message: err.message } });
                } else if(response){
                    now = _.now();
                    pidsAndLags = metaAndPairId[0].split(';');
                    opponentIsBot = pidsAndLags[0] === '1';
                    lagA = opponentIsBot ? Number.MAX_VALUE : (pidsAndLags[5] === 'MAX' ? Number.MAX_VALUE : parseInt(pidsAndLags[5]));
                    lagB = opponentIsBot ? 0 : (pidsAndLags[6] === 'MAX' ? Number.MAX_VALUE : parseInt(pidsAndLags[6]));
                    theModel = response === '-1' ? null : jsonpack.unpack(response);
                    [pidA, pidB] = [pidsAndLags[1], pidsAndLags[2]];
                    [humanIdA, humanIdB] = [+pidsAndLags[3], +pidsAndLags[4]];
                    generateFinalMessages();
                }
            };

            opClients.getGameplayRoomClient().tryToRedeemQuota([metaAndPairId[1], 2], callbackFn);
        }
        function generateFinalMessages(){
            let callbackFn = (err, response) => {
                if(!err){
                    finalMessages = response ? { a: response.responseA, b: response.responseB } : {};
                    deleteQueuePlayersAndSendWs();
                }
            };

            CF_EntryPoint.pvpAutoCloseHandler(now, opponentIsBot, pidA, pidB, humanIdA, humanIdB, lagA, lagB, theModel, callbackFn);
        }
        function deleteQueuePlayersAndSendWs(){
            let callbackFn = err => {
                if(err){
                    log.error('OP Error', { code: 587, err: { code: err.code, command: err.command, message: err.message } });
                }
                sendByPid(pidA, now, { c: -1, m: 'GR: auto gameover', dsp: finalMessages.a }, true, false);
                sendByPid(pidB, now, { c: -1, m: 'GR: auto gameover', dsp: finalMessages.b }, true, false);
            };

            opClients.getMatchmakingClient().removeQplrAndGmrb([pidA, pidB], callbackFn);
        }

        doTryToRedeemQuota();
    }
    function broadcastBitwiseBattleMessage(msg){
        var now = _.now(),
            [pidA, pidB, theMessage] = msg.split(';');

        theMessage = (theMessage && theMessage !== '-1') ? jsonpack.unpack(theMessage) : theMessage;
        if(theMessage._ts){
            theMessage._t = now - theMessage._ts;
            delete theMessage._ts;
        }
        if(theMessage.a && pidA && pidA !== '-1'){
            sendByPid(pidA, now, theMessage.a, false, true);
        }
        if(theMessage.b && pidB && pidB !== '-1'){
            sendByPid(pidB, now, theMessage.b, false, true);
        }
    }
    function broadcastBitwiseFinalMessageAndFinalizeBattle(msg){
        var now = _.now(),
            [pidA, pidB, theMessage] = msg.split(';');

        function doRemoveQplrAndGmrb(){
            let callbackFn = err => {
                if(err){
                    log.error('OP Error', { code: 618, err: { code: err.code, command: err.command, message: err.message } });
                }
                sendAndClose();
            };

            var pids = [];
            if(pidA && pidA !== '-1'){
                pids.push(pidA);
            }
            if(pidB && pidB !== '-1'){
                pids.push(pidB);
            }
            opClients.getMatchmakingClient().removeQplrAndGmrb(pids, callbackFn);
        }
        function sendAndClose(){
            theMessage = (theMessage && theMessage !== '-1') ? jsonpack.unpack(theMessage) : theMessage;
            if(theMessage._ts){
                theMessage._t = now - theMessage._ts;
                delete theMessage._ts;
            }
            if(theMessage.a && pidA && pidA !== '-1'){
                sendByPid(pidA, now, theMessage.a, true, true);
            }
            if(theMessage.b && pidB && pidB !== '-1'){
                sendByPid(pidB, now, theMessage.b, true, true);
            }
        }

        doRemoveQplrAndGmrb();
    }

    if(ch === CHANNEL_NAME){
        let prefAndMessage = msg.split('//');
        pid = prefAndMessage[0];
        msg = prefAndMessage.length <= 2 ? prefAndMessage[1] : ''.concat(...prefAndMessage.slice(1));

        if(pid === '-1'){
            handleSysMessage();
        } else {
            processPidMessage();
        }
    }
}
function processPairMessage(pairId, now, receiverPid, message){
    var messageSequenceCounter, isPlayerA, theOppSq, prevModel, newModel, gameIsOverMessage,
        battleHumanId, battlePidA, battlePidB, battleHidA, battleHidB, opponentIsBot,
        bitwiseMessage = false, messageForPlayerA, messageForPlayerB,
        finalBattleDisposition;

    var prevModelHash, modelChanged;

    function getSqsAndModel(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 367, err: { code: err.code, command: err.command, message: err.message } });
                justFailMessageWithError({ error: new ErrorResponse(367, 'OP Error'), mysq: messageSequenceCounter }, false);
            } else if(response){
                isPlayerA = response[0] === '1';
                response = response.slice(2);
                [theOppSq, prevModel] = response.split(';');
                theOppSq = _.parseIntOrNull(theOppSq);
                prevModel = jsonpack.unpack(prevModel);
                doProcessMessage();
            }
        };

        messageSequenceCounter = message.mysq;
        opClients.getGameplayRoomClient().getSequenceAndModel([
            pairId, receiverPid, pairInGameTtlMs, pausedPairTtlMs, absoluteMaximumGameplayTtlMs, now
        ], callbackFn);
    }
    function doProcessMessage(){
        var seqA, seqB;

        prevModelHash = crc32.str(JSON.stringify(prevModel) || '');

        let callbackFn = (err, response) => {
            if(err){
                justFailMessageWithError({ error: err, mysq: messageSequenceCounter }, false);
            } else {
                if(response && response.modifiedModel){
                    newModel = response.modifiedModel;
                }
                message = null;
                bitwiseMessage = true;
                if(response.messageForOpponentA != null && (!isNaN(response.messageForOpponentA) || typeof response.messageForOpponentA !== 'number')){
                    messageForPlayerA = { m: response.messageForOpponentA, oppsq: seqB };
                }
                if(response.messageForOpponentB != null && (!isNaN(response.messageForOpponentB) || typeof response.messageForOpponentB !== 'number')){
                    messageForPlayerB = { m: response.messageForOpponentB, oppsq: seqA };
                }
                whatNextWithModel();
            }
        };

        if(isPlayerA){
            seqA = messageSequenceCounter;
            seqB = theOppSq;
        } else {
            seqA = theOppSq;
            seqB = messageSequenceCounter;
        }
        CF_EntryPoint.pvpTurnHandler(now, prevModel, isPlayerA, message.m, seqA, seqB, callbackFn);
    }
    function whatNextWithModel(){
        if(message){
            message.oppsq = message.mysq;
            delete message.mysq;
            delete message.pid;
        }
        if(!newModel){
            newModel = prevModel;
        } else {
            modelChanged = prevModelHash ? ((newModel && (crc32.str(JSON.stringify(prevModel) || '') !== prevModelHash)) || newModel == null) : true;
        }
        checkIsGameOver();
    }
    function checkIsGameOver(){
        let callbackFn = (err, response) => {
            if(err){
                justFailMessageWithError({ error: err, mysq: messageSequenceCounter }, false);
            } else {
                if(response && response.responseObject){
                    gameIsOverMessage = _.isPlainObject(response.responseObject) ? response.responseObject : {};
                }
                whatsNextWithGameOver();
            }
        };

        CF_EntryPoint.pvpCheckGameOver(now, newModel, callbackFn);
    }
    function whatsNextWithGameOver(){
        if(gameIsOverMessage){
            if(message){
                gameIsOverMessage.finalm = { m: message.m };
                if(isPlayerA){
                    gameIsOverMessage.finalm.asq = messageSequenceCounter;
                    gameIsOverMessage.finalm.bsq = theOppSq;
                } else {
                    gameIsOverMessage.finalm.asq = theOppSq;
                    gameIsOverMessage.finalm.bsq = messageSequenceCounter;
                }
            } else {
                gameIsOverMessage = {};
                if(messageForPlayerA){
                    messageForPlayerA.finalm = messageForPlayerA.m;
                    delete messageForPlayerA.m;
                    delete messageForPlayerA.oppsq;
                    messageForPlayerA.gameIsOver = true;
                    gameIsOverMessage.a = messageForPlayerA;
                } else {
                    gameIsOverMessage.a = {};
                }
                if(messageForPlayerB){
                    messageForPlayerB.finalm = messageForPlayerB.m;
                    delete messageForPlayerB.m;
                    delete messageForPlayerB.oppsq;
                    messageForPlayerB.gameIsOver = true;
                    gameIsOverMessage.b = messageForPlayerB;
                } else {
                    gameIsOverMessage.b = {}
                }
            }
            processGameOver();
        } else {
            endProcessingMessage();
        }
    }
    function processGameOver(){
        endProcessingMessage();
    }
    function endProcessingMessage(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 369, err: { code: err.code, command: err.command, message: err.message } });
                justFailMessageWithError({ error: new ErrorResponse(369, 'OP Error'), mysq: messageSequenceCounter }, false);
            } else if(response && response.startsWith('1;') && !!gameIsOverMessage){
                let [__, pida, pidb, hida, hidb, isBot] = response.split(';');
                battlePidA = pida;
                battlePidB = pidb;
                battleHidA = hida === '-1' ? null : +hida;
                battleHidB = hidb === '-1' ? null : +hidb;
                opponentIsBot = !!+isBot;
                if(finalBattleDisposition){
                    getHumanIdForBattleResult();
                } else {
                    finalizeGameplay();
                }
            }
        };

        if(!gameIsOverMessage && !message){
            message = {};
            if(messageForPlayerA){
                message.a = messageForPlayerA;
            }
            if(messageForPlayerB){
                message.b = messageForPlayerB;
            }
        }
        opClients.getGameplayRoomClient().completeQueueMessage([
            pairId, receiverPid, gameIsOverMessage ? '' : message ? jsonpack.pack(message) : '',
            ((gameIsOverMessage || newModel === prevModel) && !modelChanged) ? -1 : jsonpack.pack(newModel),
            pairInGameTtlMs, timeToProcessMessageMs, pausedPairTtlMs, absoluteMaximumGameplayTtlMs, now,
            gameIsOverMessage ? jsonpack.pack(gameIsOverMessage) : '-1', +bitwiseMessage + '', messageSequenceCounter
        ], callbackFn);
    }
    function finalizeGameplay(){
        let callbackFn = err => {
            if(err){
                log.error(err);
            }
        };

        CF_EntryPoint.pvpGameOverHandler(
            now, opponentIsBot, battlePidA, battlePidB, battleHidA, battleHidB, newModel,
            callbackFn
        );
    }
    function getHumanIdForBattleResult(){
        let callbackFn = (err, response) => {
            if(!err){
                battleHumanId = response;
                persistBattleResult();
            }
        };

        getNextSequenceValue(1, callbackFn);
    }
    function persistBattleResult(){
        let callbackFn = err => {
            if(err){
                log.error('Mongodb Error', { code: 427, err: { message: err.message, name: err.name } });
            }
        };

        BattleModel.createNew({
            hid: battleHumanId,
            auto: false,
            pida: new ObjectID(battlePidA),
            pidb: new ObjectID(battlePidB),
            dsp: finalBattleDisposition,
            cat: now
        }, callbackFn);
    }
    function justFailMessageWithError(errorMessage, closeSocket){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 371, err: { code: err.code, command: err.command, message: err.message } });
            }
        };

        opClients.getGameplayRoomClient().failQueueMessage([
            pairId, receiverPid,
            jsonpack.pack(errorMessage),
            +closeSocket,
            pairInGameTtlMs, pausedPairTtlMs,
            absoluteMaximumGameplayTtlMs, now
        ], callbackFn);
    }

    getSqsAndModel();
}
function incomingConnection(socket, req){
    var now = _.now(), quasiUniqId, platformPlusVersionQ, bookingKey, forceLockExtrusion,
        platform, version, pairStat, pid, inGameState, inGameConnectionMessage, opponentPayload,
        roomOccupationToUpdate, messageForOpponent, currentlyPaused, pauseTimestamp;

    function _checkThatSocket(socket, then){
        if(socket.readyState < 2){
            then();
        } else {
            socket.removeAllListeners('message');
            socket.removeAllListeners('close');
            socket.terminate();
        }
    }
    function getQueryVariables(){
        _checkThatSocket(socket, () => {
            try{
                socket.on('message', () => {
                    try{
                        socket.send(PREINIT_MESSAGE, SOCKET_SEND_OPTS)
                    } catch(__){
                        socket.removeAllListeners('message');
                        socket.terminate();
                    }
                });
            } catch(__){
                socket.removeAllListeners('message');
                return socket.terminate();
            }

            var urlParsed = url.parse(req.url, true);

            platformPlusVersionQ = urlParsed.query.pv;
            bookingKey = urlParsed.query.bkey;
            forceLockExtrusion = urlParsed.query.f;

            if(platformPlusVersionQ && bookingKey){
                quasiUniqId = crc32.str(`${now}-${bookingKey}`);
                _checkThatSocket(socket, platformVersionCheck);
            } else {
                socketClose(socket, 4400, new ErrorResponse(957, 'Invalid input'));
            }
        });
    }
    function platformVersionCheck(){
        let callbackFn = (err, _platform, _version) => {
            if(err){
                socketClose(socket, 4400, err);
            } else {
                platform = _platform;
                version = _version;
                _checkThatSocket(socket, checkInput);
            }
        };

        platformPlusVersionCheck.doCheckInternal({ [PLATFORM_PLUS_VERSION_HEADER]: platformPlusVersionQ }, callbackFn);
    }
    function checkInput(){
        if(bookingKey && bookingKey.length > 2 && bookingKey.length < 16){
            tryToAcquireConnectionLock();
        } else {
            socketClose(socket, 4400, new ErrorResponse(372, 'Invalid booking key'));
        }
    }
    function tryToAcquireConnectionLock(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 373, err: { code: err.code, command: err.command, message: err.message } });
                socketClose(socket, 1011, new ErrorResponse(373, 'OP Error'));
            } else if(response){
                if(response === '-1'){
                    socketClose(socket, 4400, new ErrorResponse(374, 'Didn\'t found pair'));
                } else if(response.startsWith('1;')){
                    let prefixAndStatAndPid = response.split(';');
                    pairStat = prefixAndStatAndPid[1];
                    pid = prefixAndStatAndPid[2];
                    _checkThatSocket(socket, () => updatePlayerInGameroom(false));
                } else {
                    inGameState = JSON.parse(response);
                    pid = inGameState.pid;
                    delete inGameState.pid;
                    inGameState.mdl = jsonpack.unpack(inGameState.mdl);
                    if(inGameState.oppld){
                        inGameState.oppld = jsonpack.unpack(inGameState.oppld);
                    }
                    _checkThatSocket(socket, () => updatePlayerInGameroom(true));
                }
            } else {
                socketClose(socket, 4400, new ErrorResponse(375, 'Locket by exc. lock'));
            }
        };

        opClients.getGameplayRoomClient().lockConnectionAndReturnState([
            bookingKey, connectionLockTtlMs, timeToConnectPairMs,
            pairInGameTtlMs, pausedPairTtlMs, absoluteMaximumGameplayTtlMs, now,
            +!!forceLockExtrusion, quasiUniqId
        ], callbackFn);
    }
    function updatePlayerInGameroom(thenInGameConnection){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 563, err: { code: err.code, command: err.command, message: err.message } });
                socketClose(socket, 1011, new ErrorResponse(563, 'OP Error'));
            } else if(response){
                _checkThatSocket(socket, () => doRefreshStats(thenInGameConnection));
            } else {
                socketClose(socket, 4400, new ErrorResponse(564, 'Not in game'));
            }
        };

        var socketOriginalSend = socket.send;
        socket.send = function(){
            if(socket.readyState === 1){
                if(_.isObject(arguments[0])){
                    arguments[0] = JSON.stringify(arguments[0]);
                }
                socketOriginalSend.apply(socket, arguments);
            }
        };
        opClients.getMatchmakingClient().updatePlayerIsInGameroom([pid, now, playerInGameroomTtl, bookingKey], callbackFn);
    }
    function doRefreshStats(thenInGameConnection){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 376, err: { code: err.code, command: err.command, message: err.message } });
                socketClose(socket, 1011, new ErrorResponse(376, 'OP Error'));
            } else if(response && response.startsWith('1;')){
                roomOccupationToUpdate = +(response.split(';')[1]);
                _checkThatSocket(socket, () => justIncrementOccupation(thenInGameConnection));
            } else if(thenInGameConnection){
                _checkThatSocket(socket, checkPairIsPaused);
            } else {
                _checkThatSocket(socket, preGameConnection);
            }
        };

        opClients.getGameplayRoomClient().refreshStats([
            refreshStatsBatchSize,
            refreshStatsReloadingMs,
            timeToConnectPairMs,
            pairInGameTtlMs,
            pausedPairTtlMs,
            absoluteMaximumGameplayTtlMs,
            now, bookingKey,
            QUOTA_LIFETIME_MS,
            goblinBase.pvpConfig.pairsCapacity
        ], callbackFn);
    }
    function justIncrementOccupation(thenInGameConnection){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 565, err: { code: err.code, command: err.command, message: err.message } });
            }
            if(thenInGameConnection){
                _checkThatSocket(socket, checkPairIsPaused);
            } else {
                _checkThatSocket(socket, preGameConnection);
            }
        };

        opClients.getMatchmakingClient().updateRoomOccupation([ipAddress, roomTtlIndexMs, '-1', roomOccupationToUpdate], callbackFn);
    }
    function preGameConnection(){
        if(pairStat !== '3'){
            let objectWithSocketAndStuff = stuffWithSocket();
            objectWithSocketAndStuff.msgCallback = () => socketOnPreGamePing(objectWithSocketAndStuff);
            socket.removeAllListeners('message');
            socket.on('message', objectWithSocketAndStuff.msgCallback);

            let callbackFn = err => {
                if(err){
                    socket.terminate();
                } else {
                    _checkThatSocket(socket, checkUnpaused);
                }
            };

            let statData;
            switch(pairStat){
                case '0': statData = { c: 0, m: 'GR: pair allocated. Wait for opponent' }; break;
                case '1': statData = { c: 1, m: 'GR: pair formed' }; break;
                case '2': statData = { c: 2, m: 'GR: set ready' }; break;
                case '3': statData = { c: 3, m: 'GR: all players ready' }; break;
            }
            socket.send(statData, SOCKET_SEND_OPTS, callbackFn);
        } else {
            _checkThatSocket(socket, getOpponentPayload);
        }
    }
    function getOpponentPayload(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 366, err: { code: err.code, command: err.command, message: err.message } });
            } else if(response){
                opponentPayload = jsonpack.unpack(response);
                _checkThatSocket(socket, sendPlayersReady);
            }
        };

        opClients.getGameplayRoomClient().getOpponentPayloadByPid([pid], callbackFn);
    }
    function sendPlayersReady(){
        var objectWithSocketAndStuff = stuffWithSocket();
        objectWithSocketAndStuff.msgCallback = msg => socketOnMessage(objectWithSocketAndStuff, msg);
        socket.removeAllListeners('message');
        socket.on('message', objectWithSocketAndStuff.msgCallback);

        let callbackFn = err => {
            if(err){
                socket.terminate();
            } else {
                _checkThatSocket(socket, checkUnpaused);
            }
        };

        socket.send({ c: 3, m: 'GR: all players ready', oppPayload: opponentPayload }, SOCKET_SEND_OPTS, callbackFn);
    }
    function checkPairIsPaused(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 1098, err: { code: err.code, command: err.command, message: err.message } });
                socketClose(socket, 1011, new ErrorResponse(1098, 'OP Error'));
            } else {
                [currentlyPaused, pauseTimestamp] = response.split(';');
                currentlyPaused = currentlyPaused === '1';
                if(pauseTimestamp){
                    pauseTimestamp = pauseTimestamp === '-1' ? undefined : +pauseTimestamp;
                }
                prepareInGameConnectionMessage();
            }
        };

        opClients.getGameplayRoomClient().justCheckPairIsPaused([bookingKey], callbackFn);
    }
    function prepareInGameConnectionMessage(){
        let callbackFn = (err, response) => {
            if(err){
                socketClose(socket, 1011, err);
            } else {
                if(response){
                    if(response instanceof PvpConnectionHandler){
                        inGameConnectionMessage.model = response.messageForConnectedPlayer;
                        messageForOpponent = response.messageForOpponentPlayer;
                    } else {
                        inGameConnectionMessage.model = response.responseObject;
                    }
                } else {
                    inGameConnectionMessage.model = null;
                }
                if(messageForOpponent){
                    messageForOpponent = { mts: messageForOpponent, now };
                    if(pauseTimestamp){
                        messageForOpponent.fromTs = pauseTimestamp;
                    }
                }
                _checkThatSocket(socket, inGameConnection);
            }
        };

        inGameConnectionMessage = {
            playerTurnA: inGameState.tura, playerTurnB: inGameState.turb,
            isA: inGameState.isA, startTs: inGameState.mdl.startTs, randomSeed: inGameState.mdl.randomSeed,
            model: inGameState.mdl.model, opponentPayload: inGameState.oppld
        };

        CF_EntryPoint.pvpConnectionHandler(
            now, inGameState.mdl.model, !!inGameState.isA, inGameState.mdl.startTs,
            inGameState.mdl.randomSeed, inGameState.tura, inGameState.turb,
            callbackFn
        );
    }
    function inGameConnection(){
        var objectWithSocketAndStuff = stuffWithSocket();
        socket.removeAllListeners('message');
        socket.on('message', msg => socketOnMessage(objectWithSocketAndStuff, msg));

        let callbackFn = err => {
            if(err){
                socket.close();
            } else {
                _checkThatSocket(socket, checkUnpaused);
            }
        };

        var _messageToSend = { c: 4, state: inGameConnectionMessage, paused: +currentlyPaused, from: pauseTimestamp || undefined };
        if(!currentlyPaused && pauseTimestamp){
            _messageToSend.to = now;
        }

        socket.send(_messageToSend, SOCKET_SEND_OPTS, callbackFn);
    }
    function checkUnpaused(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 377, err: { code: err.code, command: err.command, message: err.message } });
            }
        };

        var args = [bookingKey, pairInGameTtlMs, pausedPairTtlMs, absoluteMaximumGameplayTtlMs, now];
        if(messageForOpponent){
            args.push(jsonpack.pack(messageForOpponent));
        }
        opClients.getGameplayRoomClient().checkPairUnpaused(args, callbackFn);
    }
    function stuffWithSocket(){
        if(wsConnections){
            let prevWs = wsConnections[pid];
            if(prevWs){
                socketClose(prevWs.sock, 4200, { m: 'GR: force closed con' });
            }
            let objectWithSocketAndStuff = { sock: socket, bookingKey, lastCheck: now, pid, platform, version, quid: quasiUniqId };
            wsConnections[pid] = objectWithSocketAndStuff;
            socket.on('close', () => socketCloseHandler(objectWithSocketAndStuff));
            return objectWithSocketAndStuff;
        }
    }

    getQueryVariables();
}
function socketCloseHandler(objectWithSocketAndStuff){
    var now = _.now(),
        theModel, disconnectedIsA, turnA, turnB, opponentIsBot, theMessageToSend;

    function tryToGetModelAndDisconnectedPlayer(){
        if(CF_EntryPoint.checkPvpDisconnectionHandlerPresence()){
            let callbackFn = (err, response) => {
                if(err){
                    log.error('OP Error', { code: 627, err: { code: err.code, command: err.command, message: err.message } });
                }
                if(err || !response){
                    theStuff();
                } else {
                    response = JSON.parse(response);
                    [theModel, disconnectedIsA, turnA, turnB, opponentIsBot] =
                        [jsonpack.unpack(response.mdl), response.isA, response.tura, response.turb, response.opbot];
                    if(opponentIsBot){
                        theStuff();
                    } else {
                        callTheOnDisconnectionHandler();
                    }
                }
            };

            opClients.getGameplayRoomClient().getModelSequencesAndPlayerStuff([
                objectWithSocketAndStuff.bookingKey, objectWithSocketAndStuff.pid, pairInGameTtlMs,
                absoluteMaximumGameplayTtlMs, now
            ], callbackFn);
        } else {
            theStuff();
        }
    }
    function callTheOnDisconnectionHandler(){
        let callbackFn = (err, response) => {
            if(!err && response){
                theMessageToSend = response.messageForConnectedOpponent;
                if(theMessageToSend){
                    theMessageToSend = jsonpack.pack({ mts: theMessageToSend, now });
                }
            }
            theStuff();
        };

        CF_EntryPoint.pvpDisconnectionHandler(now, theModel, disconnectedIsA, turnA, turnB, callbackFn);
    }
    function theStuff(){
        objectWithSocketAndStuff.sock.removeAllListeners('error');
        objectWithSocketAndStuff.sock.removeAllListeners('close');
        objectWithSocketAndStuff.sock.removeAllListeners('message');
        if(objectWithSocketAndStuff.sock.readyState < 2){
            objectWithSocketAndStuff.sock.terminate();
        }
        if(wsConnections){
            delete wsConnections[objectWithSocketAndStuff.pid];
        }

        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 378, err: { code: err.code, command: err.command, message: err.message } });
            }
        };

        var args = [
            objectWithSocketAndStuff.bookingKey,
            objectWithSocketAndStuff.pid,
            pairInGameTtlMs,
            pausedPairTtlMs,
            absoluteMaximumGameplayTtlMs,
            now
        ];
        if(!opponentIsBot && theMessageToSend){
            args.push(theMessageToSend);
        }
        opClients.getGameplayRoomClient().pausePairByDisconnect(args, callbackFn);
    }

    tryToGetModelAndDisconnectedPlayer();
}
function sendByPid(pid, now, msg, andCloseConnection, terminateIfFail, exceptSomeQuid, firstlyMakeBinary){
    var obj;

    function stuff(){
        obj = wsConnections[pid];
        if(obj && obj.quid === exceptSomeQuid){
            return;
        }
        if(msg._ts){
            msg._t = _.now() - msg._ts;
            delete msg._ts;
        }
        if(obj && obj.sock.readyState === 1 && (obj.lastCheck + socketTtlMs > now || andCloseConnection)){
            if(andCloseConnection){
                socketClose(obj.sock, 4200, msg);
            } else {
                doSend();
            }
        }
    }
    function doSend(){
        if(firstlyMakeBinary){
            msg = Buffer.from(msg, BINARY_MESSAGE_ENCODING);
        }
        if(terminateIfFail){
            let callbackFn = err => {
                if(err){
                    obj.sock.terminate();
                }
            };
            obj.sock.send(msg, SOCKET_SEND_OPTS, callbackFn);
        } else {
            obj.sock.send(msg, SOCKET_SEND_OPTS);
        }
    }

    stuff();
}
function socketOnPreGamePing(objectWithSocketAndStuff){
    var now = _.now();

    function checkPairByBookingKey(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 379, err: { code: err.code, command: err.command, message: err.message } });
                objectWithSocketAndStuff.sock.send(new ErrorResponse(379, 'OP Error'), SOCKET_SEND_OPTS);
            } else if(response === '1'){
                updatePlayerInGameroom();
            } else {
                socketClose(objectWithSocketAndStuff.sock, 4400, new ErrorResponse(380, 'Didn\'t found pair'));
            }
        };

        opClients.getGameplayRoomClient().checkPairByBookingKey(
            [objectWithSocketAndStuff.bookingKey, timeToConnectPairMs, now, connectionLockTtlMs],
            callbackFn
        );
    }
    function updatePlayerInGameroom(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 490, err: { code: err.code, command: err.command, message: err.message } });
                objectWithSocketAndStuff.sock.send(new ErrorResponse(490, 'OP Error'), SOCKET_SEND_OPTS);
            } else if(response){
                objectWithSocketAndStuff.sock.send({ preGame: now }, SOCKET_SEND_OPTS);
            } else {
                socketClose(objectWithSocketAndStuff.sock, 4400, new ErrorResponse(418, 'Not in game'));
            }
        };

        opClients.getMatchmakingClient().updatePlayerIsInGameroom(
            [objectWithSocketAndStuff.pid, now, playerInGameroomTtl, objectWithSocketAndStuff.bookingKey],
            callbackFn
        );
    }

    if(objectWithSocketAndStuff.lastCheck + socketTtlMs >= now){
        objectWithSocketAndStuff.lastCheck = now;
        checkPairByBookingKey();
    } else if(!objectWithSocketAndStuff.sock.destroyed){
        objectWithSocketAndStuff.sock.terminate();
    }
}
function socketOnMessage(objectWithSocketAndStuff, msg){
    var now = _.now(), senderPid, receiverPid, pairId, isPing,
        backupLastCheck;

    function checkSocket(){
        if(objectWithSocketAndStuff.lastCheck + socketTtlMs >= now){
            backupLastCheck = objectWithSocketAndStuff.lastCheck;
            objectWithSocketAndStuff.lastCheck = now;
            predetermineIfParsable();
        } else if(!objectWithSocketAndStuff.sock.destroyed){
            objectWithSocketAndStuff.sock.terminate();
        }
    }
    function predetermineIfParsable(){
        if(Buffer.isBuffer(msg) || (_.isString(msg) && (msg.startsWith('-{') || msg.startsWith('-[')))){
            justResendItToOpponent();
        } else if(_.isString(msg) && (msg.startsWith('{') || msg.startsWith('['))){
            predetermineIfPing();
        } else {
            objectWithSocketAndStuff.sock.send(new ErrorResponse(1043, 'Invalid message'), SOCKET_SEND_OPTS);
        }
    }
    function predetermineIfPing(){
        try{
            msg = JSON.parse(msg);
        } catch(err){
            return objectWithSocketAndStuff.sock.send(new ErrorResponse(382, 'Invalid message'), SOCKET_SEND_OPTS);
        }
        if(_.isNumber(msg.ping)){
            if(_.size(msg) === 1){
                isPing = true;
                updatePlayerInGameroom();
            } else {
                objectWithSocketAndStuff.sock.send(new ErrorResponse(381, 'Invalid message'), SOCKET_SEND_OPTS);
            }
        } else if(msg.pm === 1){
            doPingPausedPair();
        } else if(PROHIBIT_RESERVED_NODES && (msg.m.p != null || msg.m.c != null || msg.m.m != null)){
            objectWithSocketAndStuff.sock.send(new ErrorResponse(1052, 'Invalid message: root nodes "p", "c" and "m" are reserved by system'), SOCKET_SEND_OPTS);
        } else {
            isPing = false;
            checkHmacSign();
        }
    }
    function checkHmacSign(){
        let callbackFn = err => {
            if(err){
                objectWithSocketAndStuff.sock.send(err, SOCKET_SEND_OPTS);
            } else {
                updatePlayerInGameroom();
            }
        };

        var sign = msg.sign;
        delete msg.sign;
        hmacValidation.doGameroomHmacCheck(
            '/', msg, { [HMAC_SIGN_HEADER]: sign }, null, null,
            objectWithSocketAndStuff.bookingKey,
            objectWithSocketAndStuff.platform, objectWithSocketAndStuff.version,
            callbackFn
        )
    }
    function updatePlayerInGameroom(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 419, err: { code: err.code, command: err.command, message: err.message } });
                objectWithSocketAndStuff.sock.send(new ErrorResponse(419, 'OP Error'), SOCKET_SEND_OPTS);
            } else if(response){
                determineMessage();
            } else if(!isPing){
                socketClose(objectWithSocketAndStuff.sock, 4400, new ErrorResponse(420, 'Not in game'));
            } else {
                objectWithSocketAndStuff.lastCheck = backupLastCheck;
            }
        };

        opClients.getMatchmakingClient().updatePlayerIsInGameroom(
            [objectWithSocketAndStuff.pid, now, playerInGameroomTtl, objectWithSocketAndStuff.bookingKey],
            callbackFn
        );
    }
    function determineMessage(){
        if(isPing){
            doPingPair();
        } else if(_.isNumber(msg.mysq) && _.isObject(msg.m) && _.size(msg) === 2){
            msg.pid = objectWithSocketAndStuff.pid;
            if(goblinBase.pvpConfig.attachMessageTimeAtRoom){
                msg._ts = now;
            }
            getPairOpponents();
        } else {
            objectWithSocketAndStuff.sock.send(new ErrorResponse(383, 'Invalid message'), SOCKET_SEND_OPTS);
        }
    }
    function doPingPair(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 384, err: { code: err.code, command: err.command, message: err.message } });
                objectWithSocketAndStuff.sock.send(new ErrorResponse(384, 'OP Error'), SOCKET_SEND_OPTS);
            } else if(response){
                if(response === '-1'){
                    // Do nothing
                } else {
                    let yoursAndOpponents = response.split(';');
                    objectWithSocketAndStuff.sock.send({
                        yrAvg: _.parseIntOrNull(yoursAndOpponents[0]),
                        oppAvg: _.parseIntOrNull(yoursAndOpponents[1])
                    }, SOCKET_SEND_OPTS);
                }
            }
        };

        opClients.getGameplayRoomClient().pingPlayerAndPair([
            objectWithSocketAndStuff.bookingKey, msg.ping,
            pairInGameTtlMs, pausedPairTtlMs, absoluteMaximumGameplayTtlMs, now,
            connectionLockTtlMs, unpausedGameTtlMs,
            pausedTimedoutPairInactivityMs
        ], callbackFn);
    }
    function getPairOpponents(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 628, err: { code: err.code, command: err.command, message: err.message } });
                objectWithSocketAndStuff.sock.send(new ErrorResponse(628, 'OP Error'), SOCKET_SEND_OPTS);
            } else if(response){
                if(response.startsWith('1;')){
                    let prefixAndPids = response.split(';');
                    senderPid = prefixAndPids[1];
                    receiverPid = prefixAndPids[2];
                    pairId = prefixAndPids[3];
                    workoutMessageSequence();
                } else if(response === '-1'){
                    objectWithSocketAndStuff.sock.send(
                        { p: 4, c: 3, m: 'GR: cannot process message on pause', paused: 1 },
                        SOCKET_SEND_OPTS
                    );
                }
            } else {
                socketClose(objectWithSocketAndStuff.sock, 4400, new ErrorResponse(425, 'Didn\'t found pair'));
            }
        };

        opClients.getGameplayRoomClient().getPairOpponents([
            objectWithSocketAndStuff.bookingKey,
            pairInGameTtlMs, pausedPairTtlMs, unpausedGameTtlMs, absoluteMaximumGameplayTtlMs, now
        ], callbackFn);
    }
    function workoutMessageSequence(){
        if(!_.isNumber(msg.mysq) || msg.mysq < 0 || msg.mysq > MAX_INT){
            objectWithSocketAndStuff.sock.send(new ErrorResponse(626, `Invalid sequence counter: ${msg.mysq}`), SOCKET_SEND_OPTS);
        } else {
            let callbackFn = (err, response) => {
                if(err){
                    log.error('OP Error', { code: 1051, err: { code: err.code, command: err.command, message: err.message } });
                    objectWithSocketAndStuff.sock.send(new ErrorResponse(1051, 'OP Error'), SOCKET_SEND_OPTS);
                } else if(response === '1'){
                    pushMessageInQueue();
                } else if(response.startsWith('0;')){
                    let mysqShouldBe = +response.split(';')[1] + 1;
                    objectWithSocketAndStuff.sock.send({ error: new ErrorResponse(368, 'Invalid sequence'), mysq: msg.mysq, mysqShouldBe }, SOCKET_SEND_OPTS);
                }
            };

            opClients.getGameplayRoomClient().checkMessageSequenceAndIncrement([
                pairId, receiverPid, msg.mysq,
                pairInGameTtlMs, pausedPairTtlMs, absoluteMaximumGameplayTtlMs, now
            ], callbackFn);
        }
    }
    function pushMessageInQueue(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 386, err: { code: err.code, command: err.command, message: err.message } });
                objectWithSocketAndStuff.sock.send(new ErrorResponse(386, 'OP Error'), SOCKET_SEND_OPTS);
            } else if(response && response === '1'){
                /* Do nothing */
            } else {
                socketClose(objectWithSocketAndStuff.sock, 4400, new ErrorResponse(387, 'Didn\'t found pair'));
            }
        };

        msg.senderPid = senderPid;
        msg.receiverPid = receiverPid;
        var theMessage = jsonpack.pack(msg);
        opClients.getGameplayRoomClient().pushPlayerMessageInQueue([
            objectWithSocketAndStuff.bookingKey,
            theMessage,
            pairInGameTtlMs, pausedPairTtlMs, absoluteMaximumGameplayTtlMs, now
        ], callbackFn);
    }
    function justResendItToOpponent(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 996, err: { code: err.code, command: err.command, message: err.message } });
            } else if(response === '1'){
                objectWithSocketAndStuff.sock.send(msg, SOCKET_SEND_OPTS);
            }
        };

        var messageIsBuffer = Buffer.isBuffer(msg);
        opClients.getGameplayRoomClient().needToSendUnparsedMessage([
            objectWithSocketAndStuff.bookingKey,
            messageIsBuffer ? msg.toString(BINARY_MESSAGE_ENCODING) : msg,
            +messageIsBuffer + '', pairInGameTtlMs, absoluteMaximumGameplayTtlMs, now
        ], callbackFn);
    }
    function doPingPausedPair(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 1098, err: { code: err.code, command: err.command, message: err.message } });
                socketClose(socket, 1011, new ErrorResponse(1098, 'OP Error'));
            } else {
                let [currentlyPaused, pauseTimestamp, unpauseTimestamp, targetPlayerTurn] = response.split(';');
                currentlyPaused = currentlyPaused === '1';
                if(pauseTimestamp){
                    pauseTimestamp = pauseTimestamp === '-1' ? undefined : +pauseTimestamp;
                }
                if(unpauseTimestamp){
                    if(unpauseTimestamp !== '-1'){
                        unpauseTimestamp = +unpauseTimestamp;
                        if(unpauseTimestamp < pauseTimestamp){
                            unpauseTimestamp = undefined;
                        }
                    } else {
                        unpauseTimestamp = undefined;
                    }
                }
                if(targetPlayerTurn){
                    targetPlayerTurn = targetPlayerTurn === '-1' ? undefined : +targetPlayerTurn;
                }
                objectWithSocketAndStuff.sock.send(
                    { p: 4, c: 3, paused: +currentlyPaused, from: pauseTimestamp, to: unpauseTimestamp, turn: targetPlayerTurn },
                    SOCKET_SEND_OPTS
                );
            }
        };

        opClients.getGameplayRoomClient().justCheckPairIsPaused([objectWithSocketAndStuff.bookingKey], callbackFn);
    }

    checkSocket();
}

function socketClose(socket, code, message){
    if(_.isObject(message)){
        if(message.index && message.message){
            message = JSON.stringify({ index: message.index, message: message.message });
        } else {
            message = JSON.stringify(message);
        }
    }
    if(resendFinalWsMessages){
        socket.send(message, SOCKET_SEND_OPTS, () => socket.close(code));
    } else {
        socket.close(code, message);
    }
}

function shutdown(callback){
    let callbackFn = () => {
        clearTimeout(serverCloseTimeout);
        callback();
    };

    clear();
    try{
        if(server){
            server.close(callbackFn);
        }
        if(udpServer){
            udpServer.close();
        }
    } catch(err){
        return callback(err);
    }
    var serverCloseTimeout = setTimeout(() => callback(new Error('Gameplay room http server close timeout')), GAMEPLAY_ROOM_FORCE_SHUTDOWN_AFTER_MS);
}
function clear(){
    clearInterval(heartbeatInterval);
    _.each(wsConnections, wsc => {
        wsc.sock.terminate()
    });
    wsConnections = {};
}
function _getIpAddress(){
    return ipAddress;
}
function _rerunHeartbeat(){
    heartbeatInterval = setInterval(theHeartbeat, heartbeatIntervalMs);
}

function getNextSequenceValue(howMuch, callback){
    const SEQUENCE_NAME = 'battleHumanId';

    BattleCounter.getNextSequenceValue(SEQUENCE_NAME, howMuch, callback);
}