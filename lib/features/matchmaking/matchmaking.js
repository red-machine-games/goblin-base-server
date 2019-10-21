'use strict';

const MATCHMAKING_STRATEGY_BY_RATING = 'byr',
    MATCHMAKING_STRATEGY_BY_LADDER = 'bylad';

module.exports = {
    init,
    forceTryToRefreshStats,

    justCheckBattleNoSearch,
    justCheckBattleNoSearchImplementation,
    searchForOpponentOverall,
    searchForOpponentOverallImplementation,
    stopSearchingForOpponent,
    stopSearchingForOpponentImplementation,
    matchWithHandSelectedOpponent,
    matchWithHandSelectedOpponentImplementation,
    acceptMatch,
    acceptMatchImplementation,
    waitForOpponentToAccept,
    waitForOpponentToAcceptImplementation,
    declineMatch,
    declineMatchImplementation,
    dropMatchmaking,
    dropMatchmakingImplementation,

    matchPlayerOpponent,
    matchPlayerOpponentImplementation,

    MATCHMAKING_STRATEGY_BY_RATING,
    MATCHMAKING_STRATEGY_BY_LADDER
};

const goblinBase = require('../../../index.js').getGoblinBase(),
    log = goblinBase.logsHook;

const INT32_MAX = 2147483647,
    NO_MATCHMAKING_LIMITS = '0;0;-1',
    CLOSED_MATCHMAKING_LIMITS = '-1;-1;-1',
    MATCHMAKING_PREDEFINED_STRATEGY = 'predefined';

const POSITIVE_INFINITY = '+inf',
    NEGATIVE_INFINITY = '-inf',
    NRAN_MAX = 20;

var _ = require('lodash'),
    murmurhash = require('murmurhash'),
    jsonpack = require('jsonpack'),
    ObjectID = require('mongodb').ObjectID,
    crc32 = require('crc-32');

var sessionKeeper = require('../../webMiddleware/sessionKeeper.js'),
    opClients = require('../../operativeSubsystem/opClients.js'),
    CF_EntryPoint = require('../cloudFunctions/CF_EntryPoint.js');

var Profile = require('../../persistenceSubsystem/dao/profile.js');

var ErrorResponse = require('../../objects/ErrorResponse.js'),
    ErrorResponseWithCode = require('../../objects/ErrorResponseWithCode.js');

var longPollingColdResponseAfterMs, longPollingDestroyAfterMs, timeForSearchMs, timeForAcceptanceMs,
    refreshStatsReloadingMs, refreshStatsBatchSize, gameroomBookingTtl, playerInGameroomTtl, rememberAsyncOpponentMs,
    maxSearchRanges;

if(goblinBase.matchmakingConfig){
    longPollingColdResponseAfterMs = goblinBase.matchmakingConfig.numericConstants.longPollingColdResponseAfterMs;
    longPollingDestroyAfterMs = goblinBase.matchmakingConfig.numericConstants.longPollingDestroyAfterMs;
    timeForSearchMs = goblinBase.matchmakingConfig.numericConstants.timeForSearchMs;
    timeForAcceptanceMs = goblinBase.matchmakingConfig.numericConstants.timeForAcceptanceMs;
    refreshStatsReloadingMs = goblinBase.matchmakingConfig.numericConstants.refreshStatsReloadingMs;
    refreshStatsBatchSize = goblinBase.matchmakingConfig.numericConstants.refreshStatsBatchSize;
    gameroomBookingTtl = goblinBase.matchmakingConfig.numericConstants.gameroomBookingTtl;
    playerInGameroomTtl = goblinBase.matchmakingConfig.numericConstants.playerInGameroomTtl;
    rememberAsyncOpponentMs = goblinBase.matchmakingConfig.rememberAsyncOpponentMs;
    maxSearchRanges = goblinBase.matchmakingConfig.maxSearchRanges;
}

var opSubscriber,
    longPollingConnections = {};

const CHANNEL_NAME = 'mm-pub';

function init(){
    opSubscriber = opClients.getMatchmakingListenerClient();
    opSubscriber.getRedis().on('message', opHandleMessage);
    opSubscriber.getRedis().subscribe(CHANNEL_NAME);
}

function opHandleMessage(ch, msg){
    var pref, theState, theLp;

    function processIndividual(){
        [pref, msg] = msg.split('//');
        theLp = longPollingConnections[pref];
        if(theLp){
            if(msg === '1'){
                theState = 1;
            } else if(msg === '2'){
                theState = 2;
            } else if(msg === '3'){
                theState = 3;
            } else if(msg.startsWith('4;')){
                theState = 4;
            } else if(msg === '5'){
                theState = 5;
            }
            if(theLp.req){
                processLongPolling();
            } else {
                processJustCallback();
            }
        }
    }
    function processLongPolling(){
        switch(theState){
            case 1:
                if(!theLp.req.res.sent){
                    theLp.req.res.code(200).send({ stat: 'MM: accept or decline the game', c: 1 });
                    theLp.onClose();
                } else {
                    delete longPollingConnections[pref];
                }
                break;
            case 2:
                if(!theLp.req.res.sent){
                    theLp.req.res.code(200).send({ stat: 'MM: your opponent declined match', c: -1 });
                    theLp.onClose();
                } else {
                    delete longPollingConnections[pref];
                }
                break;
            case 3:
                if(!theLp.req.res.sent){
                    theLp.req.res.code(200).send({ stat: 'MM: no more rooms', c: -1 });
                    theLp.onClose();
                } else {
                    delete longPollingConnections[pref];
                }
                break;
            case 4:
                if(!theLp.req.res.sent){
                    let [__, ipAddress, mmKey] = msg.split(';');
                    theLp.req.res.code(200).send({
                        stat: 'MM: gameroom allocated', c: 3,
                        address: JSON.parse(ipAddress),
                        key: mmKey
                    });
                    theLp.onClose();
                } else {
                    delete longPollingConnections[pref];
                }
                break;
            case 5:
                if(!theLp.req.res.sent){
                    theLp.req.res.code(200).send({ stat: 'MM: timeout', c: -1 });
                }
                delete longPollingConnections[pref];
                break;
        }
    }
    function processJustCallback(){
        switch(theState){
            case 1:
                theLp.onClose(200, { stat: 'MM: accept or decline the game', c: 1 });
                break;
            case 2:
                theLp.onClose(200, { stat: 'MM: your opponent declined match', c: -1 });
                break;
            case 3:
                theLp.onClose(200, { stat: 'MM: no more rooms', c: -1 });
                break;
            case 4:
                let [__, ipAddress, mmKey] = msg.split(';');
                theLp.onClose(200, {
                    stat: 'MM: gameroom allocated', c: 3,
                    address: JSON.parse(ipAddress),
                    key: mmKey
                });
                break;
            case 5:
                theLp.onClose(200, { stat: 'MM: timeout', c: -1 });
                break;
        }
    }

    if(ch === CHANNEL_NAME){
        processIndividual();
    }
}

function forceTryToRefreshStats(sessionObject, callback){
    let callbackFn = err => {
        if(err){
            log.error('OP Error', { code: 567, err: { code: err.code, command: err.command, message: err.message } });
        }
        callback(200);
    };

    opClients.getMatchmakingClient().refreshStats([
        _.now(), refreshStatsReloadingMs, refreshStatsBatchSize,
        timeForSearchMs, timeForAcceptanceMs,
        gameroomBookingTtl, playerInGameroomTtl,
        sessionObject.pid
    ], callbackFn);
}

function justCheckBattleNoSearch(sessionObject, callback){
    var now = _.now();

    function checkSession(){
        if(sessionObject.pcrd && sessionObject.pid && sessionObject.hid){
            doJustCheckBattleNoSearch();
        } else {
            justUnlockSession(400, new ErrorResponse(588, 'You do not have a profile or should get one'));
        }
    }
    function doJustCheckBattleNoSearch(){
        let callbackFn = (code, response) => justUnlockSession(code, response);

        justCheckBattleNoSearchImplementation(sessionObject.pid, now, callbackFn);
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 1095, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkSession();
}
function justCheckBattleNoSearchImplementation(targetPid, now, callback){
    function tryToRefreshStats(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 589, err: { code: err.code, command: err.command, message: err.message } });
            }
            if(!response){
                checkInQueue();
            } else {
                callback(200, { stat: 'MM: neither in queue nor in battle', c: -1 });
            }
        };

        opClients.getMatchmakingClient().refreshStats([
            now, refreshStatsReloadingMs, refreshStatsBatchSize,
            timeForSearchMs, timeForAcceptanceMs,
            gameroomBookingTtl, playerInGameroomTtl, targetPid
        ], callbackFn);
    }
    function checkInQueue(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 590, err: { code: err.code, command: err.command, message: err.message } });
                callback(500, new ErrorResponse(590, 'OP Error'));
            } else if(!response){
                callback(200, { stat: 'MM: neither in queue nor in battle', c: -1 });
            } else if(response.startsWith('3;') || response.startsWith('4;')){
                let [pref, gameroomIp, uniqueKey] = response.split(';');
                callback(200, {
                    stat: 'MM: gameroom allocated', c: _.parseIntOrNull(pref),
                    address: JSON.parse(gameroomIp),
                    key: uniqueKey
                });
            } else {
                switch(response){
                    case '0': callback(200, { stat: 'MM: searching', c: 0 }); break;
                    case '1': callback(200, { stat: 'MM: accept or decline the game', c: 1 }); break;
                    case '2': callback(200, { stat: 'MM: waiting for opponent to accept the game', c: 2 }); break;
                    default: callback(400, new ErrorResponse(591, 'Not in queue'));
                }
            }
        };

        opClients.getMatchmakingClient()
            .checkInQueue([
                targetPid, now, timeForSearchMs, timeForAcceptanceMs,
                gameroomBookingTtl, playerInGameroomTtl
            ], callbackFn);
    }

    tryToRefreshStats();
}
function searchForOpponentOverall(sessionObject, req, clientPlatform, clientVersion, segment, strategy, mmDetails, callback){
    var now = _.now(), subsessionHash;

    function checkSession(){
        if(sessionObject.pcrd && sessionObject.pid && sessionObject.hid){
            tryAuthoritarianMatchmaking();
        } else {
            justUnlockSession(400, new ErrorResponse(289, 'You do not have a profile or should get one'));
        }
    }
    function tryAuthoritarianMatchmaking(){
        if(goblinBase.authoritarianConfig && goblinBase.authoritarianConfig.disallowDirectPvpMatchmakingExposure){
            let callbackFn = (err, response) => {
                if(err){
                    subsessionHash = null;
                    if(err instanceof ErrorResponseWithCode){
                        flushSession(err.code, err.getWithoutCode());
                    } else {
                        flushSession(500, err);
                    }
                } else if(response){
                    if(response.silentError){
                        flushSession(400, new ErrorResponse(787, `onMatchmaking error: ${response.silentError}`));
                    } else {
                        segment = response.segment;
                        strategy = response.strategy;
                        mmDetails = response.mmDetails;
                        doSearchForOpponentOverall();
                    }
                } else {
                    subsessionHash = null;
                    flushSession(400, new ErrorResponse(1088, `onMatchmaking cloud function is not implemented with authoritarian matchmaking`));
                }
            };

            if(goblinBase.cloudFunctionsConfig && goblinBase.cloudFunctionsConfig.customSession){
                subsessionHash = crc32.str(JSON.stringify(sessionObject.subs) || '');
            }
            CF_EntryPoint.onMatchmaking(
                now, sessionObject.pid, sessionObject.hid, sessionObject.subs, { segment, strategy, mmDetails },
                clientPlatform, clientVersion, sessionObject, callbackFn
            );
        } else {
            doSearchForOpponentOverall();
        }
    }
    function doSearchForOpponentOverall(){
        let callbackFn = (code, response, noResponse, lpSet) => flushSession(code, response, noResponse, lpSet);

        searchForOpponentOverallImplementation(
            now, false, req, sessionObject.pid, sessionObject.hid, segment, strategy, mmDetails, callbackFn
        );
    }
    function flushSession(code, response, noResponse){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 304, err: { code: err.code, command: err.command, message: err.message } });
            }
            if(!noResponse){
                callback(code, response);
            }
        };

        if(subsessionHash){
            let newSubsessionHash = crc32.str(JSON.stringify(sessionObject.subs) || '');
            sessionKeeper.flushSession(
                null, sessionObject, subsessionHash !== newSubsessionHash ? sessionObject.subs : null, callbackFn
            );
        } else {
            sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
        }
    }

    checkSession();
}
function searchForOpponentOverallImplementation(now, callbackInsteadOfTimeout, req, targetPid, targetHumanId,
                                                segment, strategy, mmDetails, callback){
    var isPredefinedStrategy, isUserStrategyByRating, isUserStrategyByLadder,
        theRequestTimeout, limitLeaderboardRadius, limitMmr,
        personalRequestKey, playerWl, playerMmr, wlVector, matchmakingLimits, targetPlayerRating;

    function _callback(){
        if(theRequestTimeout){
            clearTimeout(theRequestTimeout);
        }
        delete longPollingConnections[targetPid];
        callback.apply(null, arguments);
    }
    function checkInputAndDefineStrategy(){
        if(goblinBase.matchmakingConfig.strategy === MATCHMAKING_PREDEFINED_STRATEGY){
            if(strategy || mmDetails){
                _callback(400, new ErrorResponse(825, 'Matchmaking strategy closed'), undefined);
            } else {
                limitMmr = goblinBase.matchmakingConfig.limitMmr;
                limitLeaderboardRadius = goblinBase.matchmakingConfig.limitLeaderboardRadius;
                isPredefinedStrategy = true;
                setLpTimeout();
            }
        } else if(strategy === MATCHMAKING_STRATEGY_BY_RATING){
            isUserStrategyByRating = true;
            checkRanges();
        } else if(strategy === MATCHMAKING_STRATEGY_BY_LADDER){
            isUserStrategyByLadder = true;
            checkRanges();
        } else if(strategy == null){
            _callback(400, new ErrorResponse(786, 'Strategy is undefined'), undefined);
        } else {
            _callback(400, new ErrorResponse(826, 'Unknown strategy'), undefined);
        }
    }
    function checkRanges(){
        if(!mmDetails.rgs || !_.isArray(mmDetails.rgs) || !mmDetails.rgs.length || mmDetails.rgs.length > maxSearchRanges){
            return _callback(400, new ErrorResponse(827, 'Invalid ranges'), undefined);
        }
        for(let i = 0 ; i < mmDetails.rgs.length ; i++){
            let rg = mmDetails.rgs[i];
            if((!_.isNumber(rg.from) || isNaN(rg.from) || rg.from < 0 || rg.from > INT32_MAX)
                && rg.from !== NEGATIVE_INFINITY && rg.from !== POSITIVE_INFINITY){
                return _callback(400, new ErrorResponse(828, `Invalid range "from" at ${i}`), undefined);
            }
            if((!_.isNumber(rg.to) || isNaN(rg.to) || rg.to < 0 || rg.to > INT32_MAX)
                && rg.to !== POSITIVE_INFINITY && rg.to !== NEGATIVE_INFINITY){
                return _callback(400, new ErrorResponse(829, `Invalid range "to" at ${i}`), undefined);
            }
        }

        if(!callbackInsteadOfTimeout){
            setLpTimeout();
        } else {
            setJustCallback();
        }
    }
    function setLpTimeout(){
        req.raw.client.setTimeout(Math.min(longPollingDestroyAfterMs, goblinBase.accountsConfig.sessionLifetime));
        theRequestTimeout = setTimeout(() => {
            req.raw.client.removeListener('close', _onClose);
            delete longPollingConnections[targetPid];
            _callback(200, { stat: 'MM: searching', c: 0 }, undefined);
        }, longPollingColdResponseAfterMs);

        addNewLongPollingConnection();
    }
    function _onClose(){
        if(req){
            req.raw.client.removeListener('close', _onClose);
        }
        _callback(null, null, true);
    }
    function addNewLongPollingConnection(){
        if(longPollingConnections[targetPid]){
            _callback(400, new ErrorResponse(290, 'Concurrent long polling prevention'), undefined);
        } else {
            longPollingConnections[targetPid] = { pid: targetPid, req, onClose: _onClose };
            req.raw.client.once('close', _onClose);
            tryToRefreshStats();
        }
    }
    function setJustCallback(){
        theRequestTimeout = setTimeout(
            () => _callback(200, { stat: 'MM: searching', c: 0 }, undefined),
            longPollingColdResponseAfterMs
        );
        if(longPollingConnections[targetPid]){
            _callback(400, new ErrorResponse(629, 'Concurrent wait prevention'), undefined);
        } else {
            let theOnClose = (code, response) => _callback(code, response, undefined);
            longPollingConnections[targetPid] = { pid: targetPid, onClose: theOnClose };
            tryToRefreshStats();
        }
    }
    function tryToRefreshStats(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 299, err: { code: err.code, command: err.command, message: err.message } });
            }
            if(!response){
                checkInQueue();
            } else {
                _callback(200, { stat: 'MM: timeout', c: -1 });
            }
        };

        opClients.getMatchmakingClient().refreshStats([
            now, refreshStatsReloadingMs, refreshStatsBatchSize,
            timeForSearchMs, timeForAcceptanceMs,
            gameroomBookingTtl, playerInGameroomTtl,
            targetPid
        ], callbackFn);
    }
    function checkInQueue(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 291, err: { code: err.code, command: err.command, message: err.message } });
                _callback(500, new ErrorResponse(291, 'OP Error'), undefined);
            } else if(!response){
                checkTargetHumanId();
            } else if(response.startsWith('3;')){
                let [__, gameroomIp, uniqueKey] = response.split(';');
                _callback(200, {
                    stat: 'MM: gameroom allocated', c: 3,
                    address: JSON.parse(gameroomIp),
                    key: uniqueKey
                }, undefined);
            } else {
                switch(response){
                    case '0': /* Do nothing */ break;
                    case '1': _callback(200, { stat: 'MM: accept or decline the game', c: 1 }, undefined); break;
                    case '2': _callback(200, { stat: 'MM: waiting for opponent to accept the game', c: 2 }, undefined); break;
                    default: _callback(400, new ErrorResponse(292, 'Not in queue'), undefined);
                }
            }
        };

        opClients.getMatchmakingClient()
            .checkInQueue([
                targetPid, now, timeForSearchMs, timeForAcceptanceMs,
                gameroomBookingTtl, playerInGameroomTtl
            ], callbackFn);
    }
    function checkTargetHumanId(){
        if(targetHumanId){
            if(targetHumanId >= 1){
                generatePersonalRequestKey();
            } else {
                _callback(400, new ErrorResponse(630, 'Invalid human id'), undefined);
            }
        } else {
            let callbackFn = (err, doc) => {
                if(err){
                    log.error('Database Error', { code: 664, err: { code: err.code, command: err.command, message: err.message } });
                    _callback(500, new ErrorResponse(664, 'Database Error'), undefined);
                } else {
                    targetHumanId = doc.humanId;
                    generatePersonalRequestKey();
                }
            };

            Profile.findOne({ _id: new ObjectID(targetPid) }, { projection: { _id: 0, humanId: 1 } }, callbackFn);
        }
    }
    function generatePersonalRequestKey(){
        var part1 = murmurhash.v3(targetHumanId + now + goblinBase.matchmakingConfig.bookingKeySalt, _.random(0, INT32_MAX)).toString(32),
            part2 = murmurhash.v3(targetHumanId + now + goblinBase.matchmakingConfig.bookingKeySalt, _.random(0, INT32_MAX)).toString(32);

        personalRequestKey = `${part1}-${part2}`;

        if(isPredefinedStrategy){
            getPlayerWlCoefficient();
        } else if(isUserStrategyByLadder){
            getRatingsForLadderStrategy();
        } else if(isUserStrategyByRating){
            justGetPlayerRating();
        } else {
            _callback(500, new ErrorResponse(831, 'How is it possible to be here at all?'));
        }
    }
    function getPlayerWlCoefficient(){
        if(limitLeaderboardRadius || limitMmr){
            let callbackFn = (err, docFound) => {
                if(err){
                    log.error('Mongodb Error', { code: 293, err: { message: err.message, name: err.name } });
                    _callback(500, new ErrorResponse(293, 'Database Error'), undefined);
                } else {
                    playerWl = docFound.wlRate || 0;
                    playerMmr = docFound.mmr || 0;
                    getRatingLimits();
                }
            };

            var select = {};
            if(limitLeaderboardRadius){
                select.wlRate = 1;
            } else if(limitMmr){
                select.mmr = 1;
            }
            Profile.findOne({ _id: new ObjectID(targetPid) }, { projection: select }, callbackFn);
        } else {
            playerWl = 0;
            playerMmr = 0;
            getRatingLimits();
        }
    }
    function getRatingLimits(){
        if(limitLeaderboardRadius){
            let callbackFn = (err, response) => {
                if(err){
                    log.error('OP Error', { code: 294, err: { code: err.code, command: err.command, message: err.message } });
                    _callback(500, new ErrorResponse(294, 'OP Error'), undefined);
                } else if(response){
                    let limitsAndPlayerRating = response.split('/'),
                        limits = limitsAndPlayerRating[0];
                    targetPlayerRating = parseInt(limitsAndPlayerRating[1]);
                    if(limits === CLOSED_MATCHMAKING_LIMITS){
                        _callback(404, new ErrorResponse(295, 'No opponents for you now'), undefined);
                    } else {
                        matchmakingLimits = limits;
                        doSearchForOpponent();
                    }
                } else {
                    _callback(400, new ErrorResponse(296, 'You do not have a record in that segment'), undefined);
                }
            };

            wlVector = (playerWl >= 0) ? '1' : '0';
            opClients.getRecordsClient().getRatingLimitsForSearch([
                targetPid, playerWl, wlVector, limitLeaderboardRadius, segment
            ], callbackFn);
        } else {
            justGetPlayerRating();
        }
    }
    function getRatingsForLadderStrategy(){
        var thePlaces = [];
        _.each(mmDetails.rgs, rg => {
            if(_.isNumber(rg.from)){
                thePlaces.push(rg.from);
            }
            if(_.isNumber(rg.to)){
                thePlaces.push(rg.to);
            }
        });

        if(thePlaces.length){
            let callbackFn = (err, response) => {
                if(err){
                    log.error('OP Error', { code: 832, err: { code: err.code, command: err.command, message: err.message } });
                    _callback(500, new ErrorResponse(832, 'OP Error'), undefined);
                } else {
                    if(response.length > 1){
                        targetPlayerRating = parseInt(_.last(response));
                        let i = 0;
                        _.each(mmDetails.rgs, rg => {
                            if(_.isNumber(rg.from)){
                                rg.from = parseInt(response[i++]);
                            }
                            if(_.isNumber(rg.to)){
                                rg.to = parseInt(response[i++]);
                            }
                        });
                    }
                    doSearchForOpponent();
                }
            };

            opClients.getRecordsClient()
                .getRatingsFromPlaces([targetPid, thePlaces.join(','), segment], callbackFn);
        } else {
            justGetPlayerRating();
        }
    }
    function justGetPlayerRating(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 297, err: { code: err.code, command: err.command, message: err.message } });
                _callback(500, new ErrorResponse(297, 'OP Error'), undefined);
            } else if(response){
                targetPlayerRating = parseInt(response);
                if(isPredefinedStrategy){
                    if(limitMmr){
                        return calculateMatchmakingLimitsWithMmr();
                    } else {
                        matchmakingLimits = NO_MATCHMAKING_LIMITS;
                        wlVector = `${+_.coinFlip()}`;
                    }
                }
                doSearchForOpponent();
            } else {
                _callback(400, new ErrorResponse(298, 'You do not have a record in that segment'), undefined);
            }
        };

        opClients.getRecordsClient().getRedis().zscore(`rc:${segment}`, targetPid, callbackFn);
    }
    function calculateMatchmakingLimitsWithMmr(){
        wlVector = playerMmr >= targetPlayerRating;
        if(wlVector){
            var upperBound = playerMmr + limitMmr,
                lowerBound = Math.max(targetPlayerRating - limitMmr, 0);
        } else {
            upperBound = targetPlayerRating + limitMmr;
            lowerBound = Math.max(playerMmr - limitMmr, 0);
        }
        matchmakingLimits = `${upperBound};${lowerBound};${playerMmr}`;
        wlVector = +wlVector + '';
        doSearchForOpponent();
    }
    function doSearchForOpponent(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 300, err: { code: err.code, command: err.command, message: err.message } });
                _callback(500, new ErrorResponse(300, 'OP Error'), undefined);
            } else {
                switch(response){
                    case '0': _callback(503, new ErrorResponse(301, 'No free rooms yet'), undefined); break;
                    case '1': _callback(400, new ErrorResponse(302, 'Surprisingly already in queue. Please repeat!'), undefined); break;
                    case '2': /* Do nothing */ break;
                    case '3': _callback(200, { stat: 'MM: accept or decline the game', c: 1 }, undefined); break;
                    default: _callback(400, new ErrorResponse(303, 'Not in queue'), undefined);
                }
            }
        };

        if(isPredefinedStrategy){
            opClients.getMatchmakingClient().searchForOpponent([
                targetPid,
                wlVector,
                matchmakingLimits,
                targetPlayerRating,
                now, +goblinBase.matchmakingConfig.searchBothSides + '',
                segment,
                personalRequestKey,
                timeForSearchMs
            ], callbackFn);
        } else {
            let mmLimits = '';
            for(let i = 0 ; i < mmDetails.rgs.length ; i++){
                let rg = mmDetails.rgs[i];
                mmLimits += `${rg.from},${rg.to}`;
                if(i < mmDetails.rgs.length - 1){
                    mmLimits += ';';
                }
            }
            opClients.getMatchmakingClient().searchForOpponentCustomRanges([
                targetPid, mmLimits, targetPlayerRating, now, segment, personalRequestKey, timeForSearchMs
            ], callbackFn);
        }
    }

    checkInputAndDefineStrategy();
}
function stopSearchingForOpponent(sessionObject, callback){
    var now = _.now();

    function checkSession(){
        if(sessionObject.pcrd && sessionObject.pid && sessionObject.hid){
            doStopSearchingForOpponent();
        } else {
            justUnlockSession(400, new ErrorResponse(305, 'You do not have a profile or should get one'));
        }
    }
    function doStopSearchingForOpponent(){
        let callbackFn = (code, response) => justUnlockSession(code, response);

        stopSearchingForOpponentImplementation(now, sessionObject.pid, callbackFn);
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 313, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkSession();
}
function stopSearchingForOpponentImplementation(now, targetPid, callback){
    function tryToRefreshStats(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 309, err: { code: err.code, command: err.command, message: err.message } });
            }
            if(response){
                callback(200, { stat: 'MM: no more waiting', c: -1 });
            } else {
                checkInQueue();
            }
        };

        opClients.getMatchmakingClient().refreshStats([
            now, refreshStatsReloadingMs, refreshStatsBatchSize,
            timeForSearchMs, timeForAcceptanceMs,
            gameroomBookingTtl, playerInGameroomTtl,
            targetPid
        ], callbackFn);
    }
    function checkInQueue(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 306, err: { code: err.code, command: err.command, message: err.message } });
                callback(500, new ErrorResponse(306, 'OP Error'));
            } else if(!response){
                callback(400, new ErrorResponse(307, 'Not in queue'));
            } else if(response.startsWith('3;')){
                let [__, gameroomIp, uniqueKey] = response.split(';');
                callback(200, {
                    stat: 'MM: gameroom allocated', c: 3,
                    address: JSON.parse(gameroomIp),
                    key: uniqueKey
                });
            } else {
                switch(response){
                    case '0': doStopSearching(); break;
                    case '1': callback(200, { stat: 'MM: accept or decline the game', c: 1 }); break;
                    case '2': callback(200, { stat: 'MM: waiting for opponent to accept the game', c: 2 }); break;
                    default: callback(400, new ErrorResponse(308, 'Not in queue'));
                }
            }
        };

        opClients.getMatchmakingClient()
            .checkInQueue([
                targetPid, now, timeForSearchMs, timeForAcceptanceMs,
                gameroomBookingTtl, playerInGameroomTtl
            ], callbackFn);
    }
    function doStopSearching(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 310, err: { code: err.code, command: err.command, message: err.message } });
                callback(500, new ErrorResponse(310, 'OP Error'));
            } else if(response){
                switch(response){
                    case '0': callback(200, { stat: 'MM: no more waiting', c: -1 }); break;
                    case '1': callback(200, { stat: 'MM: accept or decline the game', c: 1 }); break;
                    case '2': callback(200, { stat: 'MM: waiting for opponent to accept the game', c: 2 }); break;
                    default: callback(400, new ErrorResponse(311, 'Not in queue'));
                }
            } else {
                callback(400, new ErrorResponse(312, 'Not in queue'));
            }
        };

        opClients.getMatchmakingClient().stopSearchingForOpponent([
            targetPid, now,
            timeForSearchMs
        ], callbackFn);
    }

    tryToRefreshStats();
}
function matchWithHandSelectedOpponent(sessionObject, targetHumanId, callback){
    var now = _.now();

    function checkSession(){
        if(sessionObject.aid){
            if(sessionObject.pcrd && sessionObject.pid && sessionObject.hid){
                doSearchForBotOpponent();
            } else {
                justUnlockSession(400, new ErrorResponse(661, 'You do not have a profile or should get one'));
            }
        } else {
            justUnlockSession(500, new ErrorResponse(660, 'Malformed session'));
        }
    }
    function doSearchForBotOpponent(){
        let callbackFn = (code, response) => justUnlockSession(code, response);

        matchWithHandSelectedOpponentImplementation(now, sessionObject.pid, sessionObject.hid, targetHumanId, callbackFn);
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 810, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkSession();
}
function matchWithHandSelectedOpponentImplementation(now, callerPid, callerHumanId, targetHumanId, callback){
    var opponentPid, opponentPrivateProfile, personalRequestKey;

    function hidStuff() {
        if(!targetHumanId){
            targetHumanId = callerHumanId;
        } else if(targetHumanId <= 0){
            return callback(400, new ErrorResponse(809, 'Target human ID does not looks right'));
        }
        tryToRefreshStats();
    }
    function tryToRefreshStats(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 808, err: { code: err.code, command: err.command, message: err.message } });
            }
            getOpponentPidAndPrivateProfile();
        };

        opClients.getMatchmakingClient().refreshStats([
            now, refreshStatsReloadingMs, refreshStatsBatchSize,
            timeForSearchMs, timeForAcceptanceMs,
            gameroomBookingTtl, playerInGameroomTtl,
            callerPid
        ], callbackFn);
    }
    function getOpponentPidAndPrivateProfile(){
        if(targetHumanId !== callerHumanId){
            let callbackFn = (err, doc) => {
                if(err){
                    log.error('Mongodb Error', { code: 807, err: { message: err.message, name: err.name } });
                    callback(500, new ErrorResponse(807, 'Database Error'));
                } else if(doc){
                    opponentPid = doc._id.toString();
                    opponentPrivateProfile = doc.profileData;
                    generatePersonalRequestKey();
                } else {
                    callback(404, new ErrorResponse(806, 'Didn\'t found hand selected opponent'));
                }
            };

            let projection = { _id: 1 };
            if(!goblinBase.authoritarianConfig || !goblinBase.authoritarianConfig.disallowDirectProfileExposure){
                projection.profileData = 1;
            }
            Profile.findOne(
                { humanId: targetHumanId },
                { projection },
                callbackFn
            );
        } else {
            opponentPid = callerPid;
            generatePersonalRequestKey();
        }
    }
    function generatePersonalRequestKey(){
        var part1 = murmurhash.v3(targetHumanId + now + goblinBase.matchmakingConfig.bookingKeySalt, _.random(0, INT32_MAX)).toString(32),
            part2 = murmurhash.v3(targetHumanId + now + goblinBase.matchmakingConfig.bookingKeySalt, _.random(0, INT32_MAX)).toString(32);

        personalRequestKey = `${part1}-${part2}`;
        updatePlayerState();
    }
    function updatePlayerState(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 805, err: { code: err.code, command: err.command, message: err.message } });
                callback(500, new ErrorResponse(805, 'OP Error'));
            } else {
                switch(response){
                    case '0': callback(503, new ErrorResponse(632, 'No free rooms yet')); break;
                    case '1': callback(400, new ErrorResponse(633, 'Already in queue')); break;
                    case '3': callback(200, { stat: 'MM: accept or decline the game', c: 1 }); break;
                    default: callback(400, new ErrorResponse(634, 'Not in queue'));
                }
            }
        };

        opponentPrivateProfile = opponentPrivateProfile ? jsonpack.pack(opponentPrivateProfile) : '-1';
        var args = [callerPid, opponentPid, personalRequestKey, now, opponentPrivateProfile];
        if(rememberAsyncOpponentMs){
            args.push(targetHumanId);
        }
        opClients.getMatchmakingClient().playerFoundBotOpponent(args, callbackFn);
    }

    hidStuff();
}
function acceptMatch(sessionObject, callback){
    var now = _.now();

    function checkSession(){
        if(sessionObject.pcrd && sessionObject.pid && sessionObject.hid){
            doAcceptMatch();
        } else {
            justUnlockSession(400, new ErrorResponse(314, 'You do not have a profile or should get one'));
        }
    }
    function doAcceptMatch(){
        let callbackFn = (code, response) => justUnlockSession(code, response);

        acceptMatchImplementation(now, sessionObject.pid, callbackFn);
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 323, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkSession();
}
function acceptMatchImplementation(now, targetPid, callback){
    function tryToRefreshStats(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 318, err: { code: err.code, command: err.command, message: err.message } });
            }
            checkInQueue();
        };

        opClients.getMatchmakingClient().refreshStats([
            now, refreshStatsReloadingMs, refreshStatsBatchSize,
            timeForSearchMs, timeForAcceptanceMs,
            gameroomBookingTtl, playerInGameroomTtl,
            targetPid
        ], callbackFn);
    }
    function checkInQueue(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 315, err: { code: err.code, command: err.command, message: err.message } });
                callback(500, new ErrorResponse(315, 'OP Error'));
            } else if(!response){
                callback(400, new ErrorResponse(316, 'Not in queue'));
            } else if(response.startsWith('3;')){
                let [__, gameroomIp, uniqueKey] = response.split(';');
                callback(200, {
                    stat: 'MM: gameroom allocated', c: 3,
                    address: JSON.parse(gameroomIp),
                    key: uniqueKey
                });
            } else {
                switch(response){
                    case '0': callback(200, { stat: 'MM: searching for opponent', c: 0 }); break;
                    case '1': doAcceptMatch(); break;
                    case '2': callback(200, { stat: 'MM: waiting for opponent to accept the game', c: 2 }); break;
                    default: callback(400, new ErrorResponse(317, 'Not in queue'));
                }
            }
        };

        opClients.getMatchmakingClient()
            .checkInQueue([
                targetPid, now, timeForSearchMs, timeForAcceptanceMs,
                gameroomBookingTtl, playerInGameroomTtl
            ], callbackFn);
    }
    function doAcceptMatch(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 319, err: { code: err.code, command: err.command, message: err.message } });
                callback(500, new ErrorResponse(319, 'OP Error'));
            } else if(!response){
                callback(400, new ErrorResponse(320, 'Not in queue'));
            } else {
                if(response.startsWith('3;')){
                    let [__, gameroomIp, uniqueKey] = response.split(';');
                    callback(200, {
                        stat: 'MM: gameroom allocated', c: 3,
                        address: JSON.parse(gameroomIp),
                        key: uniqueKey
                    });
                } else {
                    switch(response){
                        case '-1': callback(503, new ErrorResponse(321, 'No more free rooms')); break;
                        case '0': callback(200, { stat: 'MM: searching for opponent', c: 0 }); break;
                        case '1': callback(200, { stat: 'MM: accept or decline the game', c: 1 }); break;
                        case '2': callback(200, { stat: 'MM: waiting for opponent to accept the game', c: 2 }); break;
                        default: callback(400, new ErrorResponse(322, 'Not in queue'));
                    }
                }
            }
        };

        opClients.getMatchmakingClient().acceptMatch([
            targetPid, now, timeForAcceptanceMs, rememberAsyncOpponentMs || '0'
        ], callbackFn);
    }

    tryToRefreshStats();
}
function waitForOpponentToAccept(sessionObject, req){
    var now = _.now();

    function checkSession(){
        if(sessionObject.pcrd && sessionObject.pid && sessionObject.hid){
            doWaitForOpponentToAccept();
        } else {
            justUnlockSession(400, new ErrorResponse(324, 'You do not have a profile or should get one'));
        }
    }
    function doWaitForOpponentToAccept(){
        let callbackFn = (code, response, noResponse) => justUnlockSession(code, response, noResponse);

        waitForOpponentToAcceptImplementation(now, false, req, sessionObject.pid, callbackFn);
    }
    function justUnlockSession(code, response, noResponse){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 330, err: { code: err.code, command: err.command, message: err.message } });
            }
            if(!noResponse){
                if(!req.res.sent){
                    try{
                        req.res.code(code).send(response);
                    } catch(__){}
                }
            }
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkSession();
}
function waitForOpponentToAcceptImplementation(now, callbackInsteadOfTimeout, req, targetPid, callback){
    var theRequestTimeout;

    function _callback(){
        if(theRequestTimeout){
            clearTimeout(theRequestTimeout);
        }
        delete longPollingConnections[targetPid];
        callback.apply(null, arguments);
    }
    function manageTimeout(){
        if(!callbackInsteadOfTimeout){
            setLpTimeout();
        } else {
            setJustCallback();
        }
    }
    function setLpTimeout(){
        req.raw.client.setTimeout(Math.min(longPollingDestroyAfterMs, goblinBase.accountsConfig.sessionLifetime));
        theRequestTimeout = setTimeout(() => {
            req.raw.client.removeListener('close', _onClose);
            delete longPollingConnections[targetPid];
            _callback(200, { stat: 'MM: waiting for opponent to accept the game', c: 2 });
        }, longPollingColdResponseAfterMs);

        addNewLongPollingConnection();
    }
    function _onClose(){
        if(req){
            req.raw.client.removeListener('close', _onClose);
        }
        _callback(null, null, true);
    }
    function addNewLongPollingConnection(){
        if(longPollingConnections[targetPid]){
            _callback(400, new ErrorResponse(325, 'Concurrent long polling prevention'));
        } else {
            longPollingConnections[targetPid] = { pid: targetPid, req, onClose: _onClose };
            req.raw.client.once('close', _onClose);
            tryToRefreshStats();
        }
    }
    function setJustCallback(){
        theRequestTimeout = setTimeout(
            () => _callback(200, { stat: 'MM: searching', c: 0 }),
            longPollingColdResponseAfterMs
        );
        if(longPollingConnections[targetPid]){
            _callback(400, new ErrorResponse(635, 'Concurrent wait prevention'));
        } else {
            longPollingConnections[targetPid] = { pid: targetPid, onClose: _callback };
            tryToRefreshStats();
        }
    }
    function tryToRefreshStats(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 329, err: { code: err.code, command: err.command, message: err.message } });
            }
            if(!response){
                checkInQueue();
            } else {
                _callback(200, { stat: 'MM: timeout', c: -1 });
            }
        };

        opClients.getMatchmakingClient().refreshStats([
            now, refreshStatsReloadingMs, refreshStatsBatchSize,
            timeForSearchMs, timeForAcceptanceMs,
            gameroomBookingTtl, playerInGameroomTtl,
            targetPid
        ], callbackFn);
    }
    function checkInQueue(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 326, err: { code: err.code, command: err.command, message: err.message } });
                _callback(500, new ErrorResponse(326, 'OP Error'));
            } else if(!response){
                _callback(400, new ErrorResponse(327, 'Not in queue'));
            } else if(response.startsWith('3;')){
                let [__, gameroomIp, uniqueKey] = response.split(';');
                _callback(200, {
                    stat: 'MM: gameroom allocated', c: 3,
                    address: JSON.parse(gameroomIp),
                    key: uniqueKey
                });
            } else {
                switch(response){
                    case '0': _callback(200, { stat: 'MM: searching for opponent', c: 0 }); break;
                    case '1': _callback(200, { stat: 'MM: accept or decline the game', c: 1 }); break;
                    case '2': /* Do nothing */ break;
                    default: _callback(400, new ErrorResponse(328, 'Not in queue'));
                }
            }
        };

        opClients.getMatchmakingClient()
            .checkInQueue([
                targetPid, now, timeForSearchMs,
                timeForAcceptanceMs, gameroomBookingTtl, playerInGameroomTtl
            ], callbackFn);
    }

    manageTimeout();
}
function declineMatch(sessionObject, callback){
    var now = _.now();

    function checkSession(){
        if(sessionObject.pcrd && sessionObject.pid && sessionObject.hid){
            doDeclineMatch();
        } else {
            justUnlockSession(400, new ErrorResponse(331, 'You do not have a profile or should get one'));
        }
    }
    function doDeclineMatch(){
        let callbackFn = (code, response) => justUnlockSession(code, response);

        declineMatchImplementation(now, sessionObject.pid, callbackFn);
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 339, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkSession();
}
function declineMatchImplementation(now, targetPid, callback) {
    function tryToRefreshStats(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 335, err: { code: err.code, command: err.command, message: err.message } });
            }
            checkInQueue();
        };

        opClients.getMatchmakingClient().refreshStats([
            now, refreshStatsReloadingMs, refreshStatsBatchSize,
            timeForSearchMs, timeForAcceptanceMs,
            gameroomBookingTtl, playerInGameroomTtl,
            targetPid
        ], callbackFn);
    }
    function checkInQueue(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 332, err: { code: err.code, command: err.command, message: err.message } });
                callback(500, new ErrorResponse(332, 'OP Error'));
            } else if(!response){
                callback(400, new ErrorResponse(333, 'Not in queue'));
            } else if(response.startsWith('3;')){
                let [__, gameroomIp, uniqueKey] = response.split(';');
                callback(200, {
                    stat: 'MM: gameroom allocated', c: 3,
                    address: JSON.parse(gameroomIp),
                    key: uniqueKey
                });
            } else {
                switch(response){
                    case '0': callback(200, { stat: 'MM: searching for opponent', c: 0 }); break;
                    case '1': doDeclineMatch(); break;
                    case '2': callback(200, { stat: 'MM: waiting for opponent to accept the game', c: 2 }); break;
                    default: callback(400, new ErrorResponse(334, 'Not in queue'));
                }
            }
        };

        opClients.getMatchmakingClient()
            .checkInQueue([targetPid, now, timeForSearchMs, timeForAcceptanceMs, gameroomBookingTtl, playerInGameroomTtl], callbackFn);
    }
    function doDeclineMatch(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 336, err: { code: err.code, command: err.command, message: err.message } });
                callback(500, new ErrorResponse(336, 'OP Error'));
            } else if(!response){
                callback(200, { stat: 'MM: match declined', c: -1 });
            } else {
                switch(response){
                    case '0': callback(200, { stat: 'MM: searching for opponent', c: 0 }); break;
                    case '1': callback(200, { stat: 'MM: match declined', c: -1 }); break;
                    case '2': callback(200, { stat: 'MM: waiting for opponent to accept the game', c: 2 }); break;
                    default: callback(400, new ErrorResponse(338, 'Not in queue'));
                }
            }
        };

        opClients.getMatchmakingClient().declineMatch([targetPid, now, timeForAcceptanceMs], callbackFn)
    }

    tryToRefreshStats();
}

function dropMatchmaking(sessionObject, callback){
    var now = _.now();

    function checkSession(){
        if(sessionObject.pcrd && sessionObject.pid && sessionObject.hid){
            doDropMatchmaking();
        } else {
            justUnlockSession(400, new ErrorResponse(1001, 'You do not have a profile or should get one'));
        }
    }
    function doDropMatchmaking(){
        let callbackFn = (code, response) => justUnlockSession(code, response);

        dropMatchmakingImplementation(now, sessionObject.pid, callbackFn);
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 1002, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkSession();
}
function dropMatchmakingImplementation(now, targetPid, callback){
    function tryToRefreshStats(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 1003, err: { code: err.code, command: err.command, message: err.message } });
            }
            dropAllMatchmakingData();
        };

        opClients.getMatchmakingClient().refreshStats([
            now, refreshStatsReloadingMs, refreshStatsBatchSize,
            timeForSearchMs, timeForAcceptanceMs,
            gameroomBookingTtl, playerInGameroomTtl,
            targetPid
        ], callbackFn);
    }
    function dropAllMatchmakingData(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 1004, err: { code: err.code, command: err.command, message: err.message } });
                callback(500, new ErrorResponse(1004, 'OP Error'));
            } else {
                callback(200, { forReal: !!response });
            }
        };

        opClients.getMatchmakingClient().dropAllMatchmakingData([targetPid], callbackFn);
    }

    tryToRefreshStats();
}

function matchPlayerOpponent(sessionObject, clientPlatform, clientVersion, segment, strategy, mmDetails, callback){
    var now = _.now(), subsessionHash;

    function checkSession(){
        if(sessionObject.pcrd && sessionObject.pid && sessionObject.hid){
            tryAuthoritarianMatchmaking();
        } else {
            flushSession(400, new ErrorResponse(848, 'You do not have a profile or should get one'));
        }
    }
    function tryAuthoritarianMatchmaking(){
        if(goblinBase.authoritarianConfig && goblinBase.authoritarianConfig.disallowDirectPvpMatchmakingExposure){
            let callbackFn = (err, response) => {
                if(err){
                    subsessionHash = null;
                    if(err instanceof ErrorResponseWithCode){
                        flushSession(err.code, err.getWithoutCode());
                    } else {
                        flushSession(500, err);
                    }
                } else if(response){
                    segment = response.segment;
                    strategy = response.strategy;
                    mmDetails = response.mmDetails;
                    doMatchPlayerOpponent();
                } else {
                    subsessionHash = null;
                    flushSession(400, new ErrorResponse(1090, `onMatchmaking cloud function is not implemented with authoritarian matchmaking`));
                }
            };

            if(goblinBase.cloudFunctionsConfig && goblinBase.cloudFunctionsConfig.customSession){
                subsessionHash = crc32.str(JSON.stringify(sessionObject.subs) || '');
            }
            CF_EntryPoint.onMatchmaking(
                now, sessionObject.pid, sessionObject.hid, sessionObject.subs, { segment, strategy, mmDetails },
                clientPlatform, clientVersion, sessionObject, callbackFn
            );
        } else {
            doMatchPlayerOpponent();
        }
    }
    function doMatchPlayerOpponent(){
        let callbackFn = (err, code, response) => flushSession(code, err || response);

        matchPlayerOpponentImplementation(
            sessionObject.pid, segment, strategy, mmDetails, rememberAsyncOpponentMs, true, callbackFn
        );
    }
    function flushSession(code, response, noResponse){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 857, err: { code: err.code, command: err.command, message: err.message } });
            }
            if(!noResponse){
                callback(code, response);
            }
        };

        if(subsessionHash){
            let newSubsessionHash = crc32.str(JSON.stringify(sessionObject.subs) || '');
            sessionKeeper.flushSession(
                null, sessionObject, subsessionHash !== newSubsessionHash ? sessionObject.subs : null, callbackFn
            );
        } else {
            sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
        }
    }

    checkSession();
}
function matchPlayerOpponentImplementation(pid, segment, strategy, mmDetails, rememberMatchForMs,
                                           returnPublicData, callback){
    var now = _.now(),
        isUserStrategyByLadder, forbidPid, opponentPid, opponentHumanId, publicProfileData, opponentVer;

    function checkInputAndDefineStrategy(){
        if(goblinBase.matchmakingConfig.strategy === MATCHMAKING_PREDEFINED_STRATEGY){
            callback(new ErrorResponse(842, 'Strategy is predefined - this is unavailable'), 400);
        } else if(strategy === MATCHMAKING_STRATEGY_BY_RATING){
            isUserStrategyByLadder = false;
            checkRanges();
        } else if(strategy === MATCHMAKING_STRATEGY_BY_LADDER){
            isUserStrategyByLadder = true;
            checkRanges();
        } else if(strategy == null){
            _callback(400, new ErrorResponse(785, 'Strategy is undefined'), undefined);
        } else {
            _callback(400, new ErrorResponse(843, 'Unknown strategy'), undefined);
        }
    }
    function checkRanges(){
        if(mmDetails.nran && (!_.isNumber(mmDetails.nran) || isNaN(mmDetails.nran) || mmDetails.nran > NRAN_MAX || mmDetails.nran < 1)){
            callback(new ErrorResponse(844, 'Invalid nran'), 400);
        }
        if(!mmDetails.rgs || !_.isArray(mmDetails.rgs) || !mmDetails.rgs.length || mmDetails.rgs.length > maxSearchRanges){
            callback(new ErrorResponse(845, 'Invalid ranges'), 400);
        }
        for(let i = 0 ; i < mmDetails.rgs.length ; i++){
            let rg = mmDetails.rgs[i];
            if((!_.isNumber(rg.from) || isNaN(rg.from) || rg.from < 0 || rg.from > INT32_MAX)
                && rg.from !== NEGATIVE_INFINITY && rg.from !== POSITIVE_INFINITY){
                return callback(new ErrorResponse(846, `Invalid range "from" at ${i}`), 400);
            }
            if((!_.isNumber(rg.to) || isNaN(rg.to) || rg.to < 0 || rg.to > INT32_MAX)
                && rg.to !== POSITIVE_INFINITY && rg.to !== NEGATIVE_INFINITY){
                return callback(new ErrorResponse(847, `Invalid range "to" at ${i}`), 400);
            }
        }

        tryToRefreshStats();
    }
    function tryToRefreshStats(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 849, err: { code: err.code, command: err.command, message: err.message } });
            }
            getRememberedPid();
        };

        opClients.getMatchmakingClient().refreshStats([
            now, refreshStatsReloadingMs, refreshStatsBatchSize,
            timeForSearchMs, timeForAcceptanceMs,
            gameroomBookingTtl, playerInGameroomTtl,
            pid
        ], callbackFn);
    }
    function getRememberedPid(){
        if(rememberAsyncOpponentMs){
            let callbackFn = (err, response) => {
                if(err){
                    log.error('OP Error', { code: 851, err: { code: err.code, command: err.command, message: err.message } });
                    callback(new ErrorResponse(851, 'OP Error'), 500);
                } else {
                    forbidPid = response;
                    doSearchForOpponent();
                }
            };

            opClients.getMatchmakingClient().getRedis().get(`mmrem:${pid}`, callbackFn);
        } else {
            doSearchForOpponent();
        }
    }
    function doSearchForOpponent(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 852, err: { code: err.code, command: err.command, message: err.message } });
                callback(new ErrorResponse(852, 'OP Error'), 500);
            } else if(response){
                opponentPid = response;
                if(returnPublicData){
                    getOpponentPublicProfile();
                } else {
                    getOpponentHumanId();
                }
            } else {
                callback(new ErrorResponse(853, 'No opponent'), 404);
            }
        };

        var mmLimits = '';
        for(let i = 0 ; i < mmDetails.rgs.length ; i++){
            let rg = mmDetails.rgs[i];
            mmLimits += `${rg.from},${rg.to}`;
            if(i < mmDetails.rgs.length - 1){
                mmLimits += ';';
            }
        }
        opClients.getRecordsClient().searchForPlayerCustomRanges([
            pid, mmLimits, +isUserStrategyByLadder, mmDetails.nran || '1', forbidPid || '0', segment
        ], callbackFn);
    }
    function getOpponentHumanId(){
        let callbackFn = (err, doc) => {
            if(err){
                log.error('Mongodb Error', { code: 817, err: { message: err.message, name: err.name } });
                callback(new ErrorResponse(817, 'Database Error'), 500);
            } else if(doc){
                opponentHumanId = doc.humanId;
                tryToRememberNewPid();
            } else {
                callback(new ErrorResponse(812, 'No opponent'), 404);
            }
        };

        Profile.findOne(
            { _id: new ObjectID(opponentPid) },
            { projection: { _id: 0, humanId: 1 } },
            callbackFn
        );
    }
    function getOpponentPublicProfile(){
        let callbackFn = (err, doc) => {
            if(err){
                log.error('Mongodb Error', { code: 854, err: { message: err.message, name: err.name } });
                callback(new ErrorResponse(854, 'Database Error'), 500);
            } else if(doc){
                opponentHumanId = doc.humanId;
                publicProfileData = doc.publicProfileData;
                opponentVer = doc.ver;
                tryToRememberNewPid();
            } else {
                callback(new ErrorResponse(855, 'No opponent'), 404);
            }
        };

        Profile.findOne(
            { _id: new ObjectID(opponentPid) },
            { projection: { _id: 0, publicProfileData: 1, humanId: 1, ver: 1 } },
            callbackFn
        );
    }
    function tryToRememberNewPid(){
        if(rememberMatchForMs){
            let callbackFn = err => {
                if(err){
                    log.error('OP Error', { code: 856, err: { code: err.code, command: err.command, message: err.message } });
                }
                doResponse();
            };

            opClients.getMatchmakingClient().getRedis()
                .set(`mmrem:${pid}`, opponentPid, 'px', rememberMatchForMs, callbackFn);
        } else {
            doResponse();
        }
    }
    function doResponse(){
        var theResponse = { humanId: opponentHumanId };
        if(publicProfileData){
            theResponse.publicProfileData = publicProfileData;
        }
        if(opponentVer){
            theResponse.ver = opponentVer;
        }
        callback(null, 200, theResponse);
    }

    checkInputAndDefineStrategy();
}