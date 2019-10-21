'use strict';

const goblinBase = require('../../../index.js').getGoblinBase();

const MATCHMAKING_STRATEGY_BY_RATING = require('../matchmaking/matchmaking.js').MATCHMAKING_STRATEGY_BY_RATING,
    MATCHMAKING_STRATEGY_BY_LADDER = require('../matchmaking/matchmaking.js').MATCHMAKING_STRATEGY_BY_LADDER;

var _ = require('lodash'),
    crc32 = require('crc-32');

var matchmakingApi = require('./apiLayer/matchmakingApi.js'),
    realtimeMatchmakingApi = require('./apiLayer/realtimeMatchmakingApi.js');

var ErrorResponse = require('../../objects/ErrorResponse.js');

class InternalStuff{
    constructor(allowToAccessProfile, allowToAccessRecords, currentFuncToAct, allowToDefineGlobal, allowToMatchmake,
                theSecretCallback, clientPlatform, clientVersion, callerSessionObject, theLock, now){
        this.allowToAccessProfile = allowToAccessProfile;
        this.setOfProfileNodes = {};
        this.setOfProfileNodesToRead = {};
        this.fakeProfileAccess = false;
        this.setOfPublicProfileNodes = {};
        this.setOfPublicProfileNodesToRead = {};
        this.allowToAccessRecords = allowToAccessRecords;
        this.setOfRecordNodes = {};
        this.currentFuncToAct = currentFuncToAct;
        this.objectToReturn = null;
        this.allowToDefineGlobal = allowToDefineGlobal;
        this.allowToMatchmake = allowToMatchmake;
        this.theSecretCallback = theSecretCallback;
        this.clientPlatform = clientPlatform;
        this.clientVersion = clientVersion;
        this.receipts = [];
        this.fakeIapValidation = false;
        this.callerSessionObject = callerSessionObject;
        this.battleJournalEntries = [];
        this.acquiredResourceLock = theLock;
        this.now = now;
        this.traces = [];
    }
}
class AllTheStuff{
    constructor(getProfileNode, getSomeProfileNode, getPublicProfileNode, setProfileNode, setSomeProfileNode,
                getSelfRating, setSelfRating, getSomeonesRating, setSomeonesRating, getSelfRatings, checkForBattleDebts,
                allowToMatchmake, argv, internalStuff, defineGlobal, CreateNewProfileResponse,
                MutateProfileResponse, PveInitResponse, PveActResponse, PveFinalizeResponse, FunctionResponse,
                PvpResponse, PvpMessageHandler, PvpConnectionHandlerF, PvpDisconnectionHandlerF, PvpAutoDefeatResponse,
                OnMatchmakingResponseF, selfHumanId, args, session, clientParams, validateStoreReceipt, appendBattleJournalPve,
                appendSelfBattleJournalPve, appendBattleJournalPvp, selfLock, selfAndSomeLock, onlySomeLock, getLock,
                returnCurrentLock, checkIsBot, run, accessOnlyInternal, accessOnlyExternal, theGlobal, trace, log){

        this.getProfileNode = getProfileNode;
        this.getSomeProfileNode = getSomeProfileNode;
        this.getPublicProfileNode = getPublicProfileNode;
        this.setProfileNode = setProfileNode;
        this.setSomeProfileNode = setSomeProfileNode;
        this.getSelfRating = getSelfRating;
        this.setSelfRating = setSelfRating;
        this.getSomeonesRating = getSomeonesRating;
        this.setSomeonesRating = setSomeonesRating;
        this.getSelfRatings = getSelfRatings;
        this.checkForBattleDebts = checkForBattleDebts;
        this.matchmaking = allowToMatchmake ? new Matchmaking(argv, internalStuff) : undefined;
        this.defineGlobal = defineGlobal;
        this.CreateNewProfileResponse = CreateNewProfileResponse;
        this.MutateProfileResponse = MutateProfileResponse;
        this.PveInitResponse = PveInitResponse;
        this.PveActResponse = PveActResponse;
        this.PveFinalizeResponse = PveFinalizeResponse;
        this.FunctionResponse = FunctionResponse;
        this.PvpResponse = PvpResponse;
        this.PvpMessageHandler = PvpMessageHandler;
        this.PvpConnectionHandlerF = PvpConnectionHandlerF;
        this.PvpDisconnectionHandlerF = PvpDisconnectionHandlerF;
        this.PvpAutoDefeatResponse = PvpAutoDefeatResponse;
        this.OnMatchmakingResponseF = OnMatchmakingResponseF;
        this.runtimeVersions = new RuntimeVersionsHolder();
        this.selfHumanId = selfHumanId;
        this.now = _.now();
        this.args = args;
        this.session = session;
        this.clientParams = clientParams;
        this.glob = theGlobal;
        this.validateStoreReceipt = validateStoreReceipt;
        this.appendBattleJournalPve = appendBattleJournalPve;
        this.appendSelfBattleJournalPve = appendSelfBattleJournalPve;
        this.appendBattleJournalPvp = appendBattleJournalPvp;
        this.lock = new ResourceLock(selfLock, selfAndSomeLock, onlySomeLock, getLock);
        this.relock = new ResourceRelock(selfLock, selfAndSomeLock, onlySomeLock, returnCurrentLock);
        this.checkIsBot = checkIsBot;
        this.run = run;
        this.access = new FunctionAccessCheck(accessOnlyInternal, accessOnlyExternal);
        this.trace = trace;
        this.log = log;
    }
}
class TheArgv{
    constructor(pid, selfHumanId){
        this._pid = pid;
        this.selfHumanId = selfHumanId;
    }
}
class BattleJournalPve{
    constructor(hid, phid, pid, dsp, cat){
        this.hid = hid;
        if(phid){
            this.personHumanId = phid;
        }
        this.pid = pid;
        if(_.isPlainObject(dsp)){
            this.dsp = dsp;
        } else {
            throw new ErrorResponse(877, 'Pve BJE should be an object');
        }
        this.cat = cat;
    }
}
class BattleJournalPvp{
    constructor(hid, phida, phidb, auto, pida, pidb, dsp, cat){
        this.hid = hid;
        if(phida){
            this.personHumanIdA = phida;
        }
        if(phidb){
            this.personHumanIdB = phidb;
        }
        this.auto = auto;
        this.pida = pida;
        this.pidb = pidb;
        if(_.isPlainObject(dsp)){
            this.dsp = dsp;
        } else {
            throw new ErrorResponse(704, 'PvP BJE should be an object');
        }
        this.cat = cat;
    }
}

class ResourceLock{
    constructor(selfLock, selfAndSomeLock, onlySomeLock, getLock){
        this.self = selfLock;
        this.selfAnd = selfAndSomeLock;
        this.some = onlySomeLock;
        this.check = getLock;
    }
}
class ResourceRelock{
    constructor(selfLock, selfAndSomeLock, onlySomeLock, returnCurrentLock){
        this.self = async function(){
            await returnCurrentLock();
            await selfLock(arguments);
        };
        this.selfAnd = async function(){
            await returnCurrentLock();
            await selfAndSomeLock.apply(undefined, arguments);
        };
        this.some = async function(){
            await returnCurrentLock();
            await onlySomeLock.apply(undefined, arguments);
        };
    }
}
class FunctionAccessCheck{
    constructor(accessOnlyInternal, accessOnlyExternal){
        this.onlyInternal = accessOnlyInternal;
        this.onlyExternal = accessOnlyExternal;
    }
}
class ProfileNode{
    constructor(path, value, hid, pid, readOnly, fakeProfileAccess){
        this.path = path;
        if(readOnly){
            this.readOnly = readOnly;
        }
        if(fakeProfileAccess){
            this.fakeProfileAccess = fakeProfileAccess;
        }
        if(readOnly){
            Object.defineProperty(this, 'value', { value: value, writable: false, enumerable: true, configurable: false });
            Object.defineProperty(this, 'hasBeenModified', {
                value: false, writable: false, enumerable: false, configurable: false
            });
        } else {
            let hasBeenModified = false;

            if(_.isObject(value) || _.isArray(value)){
                Object.defineProperty(this, 'isNotSimple', { value: true, writable: false, enumerable: false, configurable: false });
                Object.defineProperty(this, 'valueHash', {
                    value: crc32.str(JSON.stringify(value) || ''), writable: false, enumerable: false, configurable: false
                });
            }
            Object.defineProperty(this, 'value', {
                get: () => value,
                set: v => {
                    this.hasBeenModified = true;
                    value = v;
                },
                enumerable: true,
                configurable: false
            });
            this.hasBeenModified = hasBeenModified;
        }
        this.humanId = hid;
        this.pid = pid;
    }
}
class PublicProfileNode{
    constructor(humanId, path, value){
        this.humanId = humanId;
        this.path = path;
        this.value = value;
    }
}
class RatingNode{
    constructor(humanId, pid, segment, value, thisOneIsReadOnly, fakeProfileAccess){
        this.humanId = humanId;
        this.segment = segment;
        if(fakeProfileAccess){
            this.fakeProfileAccess = fakeProfileAccess;
        }
        this.originalValue = value;
        if(thisOneIsReadOnly){
            this.thisOneIsReadOnly = thisOneIsReadOnly;
        }

        Object.defineProperty(this, 'value', {
            get: () => value,
            set: _value => {
                if(this.thisOneIsReadOnly){
                    throw new ErrorResponse(716, 'Can\'t set record that is not yours');
                }
                if(_.isNumber(_value) && !isNaN(_value) && _value >= -1){
                    value = _value;
                } else {
                    throw new ErrorResponse(717, 'Setting invalid value');
                }
            },
            enumerable: false, configurable: false
        });
        this.pid = pid;
    }
}
class Matchmaking{
    constructor(argv, internalStuff){
        this.getPlayer = async (segment, ranges, nRandom, rememberMatchForMs) => {
            if(!goblinBase.matchmakingConfig){
                throw new ErrorResponse(882, 'Not implemented')
            } else if(!internalStuff.allowToMatchmake){
                throw new ErrorResponse(883, 'Matchmaking is not allowed')
            } else {
                return matchmakingApi.matchPlayerOpponent(
                    argv._pid, segment, MATCHMAKING_STRATEGY_BY_RATING, ranges,
                    nRandom, rememberMatchForMs, internalStuff.fakeMatchmaking
                );
            }
        };
        this.getPlayerByLadder = async (segment, ranges, nRandom, rememberMatchForMs) => {
            if(!goblinBase.matchmakingConfig){
                throw new ErrorResponse(884, 'Not implemented')
            } else if(!internalStuff.allowToMatchmake){
                throw new ErrorResponse(885, 'Matchmaking is not allowed')
            } else {
                return matchmakingApi.matchPlayerOpponent(
                    argv._pid, segment, MATCHMAKING_STRATEGY_BY_LADDER, ranges,
                    nRandom, rememberMatchForMs, internalStuff.fakeMatchmaking
                );
            }
        };
        this.checkPvpNoSearch = async () => {
                if(!goblinBase.matchmakingConfig){
                    throw new ErrorResponse(878, 'Not implemented')
                } else if(!internalStuff.allowToMatchmake){
                    throw new ErrorResponse(705, 'Matchmaking is not allowed')
                } else {
                    return realtimeMatchmakingApi.checkPvpNoSearch(argv._pid, _.now());
                }
        };
        this.dropMatchmaking = async () => {
                if(!goblinBase.matchmakingConfig){
                    throw new ErrorResponse(997, 'Not implemented')
                } else if(!internalStuff.allowToMatchmake){
                    throw new ErrorResponse(998, 'Matchmaking is not allowed')
                } else {
                    return realtimeMatchmakingApi.dropMatchmaking(argv._pid, _.now());
                }
        };
        this.searchPvpOpponent = async (segment, ranges, nRandom) => {
            if(!goblinBase.matchmakingConfig){
                throw new ErrorResponse(879, 'Not implemented')
            } else if(!internalStuff.allowToMatchmake){
                throw new ErrorResponse(706, 'Matchmaking is not allowed')
            } else {
                return realtimeMatchmakingApi.searchPvpOpponent(
                    argv._pid, _.now(), segment, MATCHMAKING_STRATEGY_BY_RATING, ranges, nRandom
                );
            }
        };
        this.searchPvpOpponentByLadder = async (segment, ranges, nRandom) => {
            if(!goblinBase.matchmakingConfig){
                throw new ErrorResponse(880, 'Not implemented')
            } else if(!internalStuff.allowToMatchmake){
                throw new ErrorResponse(707, 'Matchmaking is not allowed')
            } else {
                return realtimeMatchmakingApi.searchPvpOpponent(
                    argv._pid, _.now(), segment, MATCHMAKING_STRATEGY_BY_LADDER, ranges, nRandom
                );
            }
        };
        this.stopSearchingForAnyPvpOpponent = async () => {
            if(!goblinBase.matchmakingConfig){
                throw new ErrorResponse(710, 'Not implemented')
            } else if(!internalStuff.allowToMatchmake){
                throw new ErrorResponse(712, 'Matchmaking is not allowed')
            } else {
                return realtimeMatchmakingApi.stopSearchingForAnyPvpOpponent(argv._pid, _.now());
            }
        };
        this.handSelectPvpOpponent = async targetHumanId => {
            if(!goblinBase.matchmakingConfig){
                throw new ErrorResponse(714, 'Not implemented')
            } else if(!internalStuff.allowToMatchmake){
                throw new ErrorResponse(715, 'Matchmaking is not allowed')
            } else {
                return realtimeMatchmakingApi.matchWithHandSelectedOpponent(
                    argv._pid, argv.selfHumanId, targetHumanId, _.now()
                );
            }
        };
        this.acceptPvpMatch = async () => {
            if(!goblinBase.matchmakingConfig){
                throw new ErrorResponse(820, 'Not implemented')
            } else if(!internalStuff.allowToMatchmake){
                throw new ErrorResponse(881, 'Matchmaking is not allowed')
            } else {
                return realtimeMatchmakingApi.acceptPvpMatch(argv._pid, _.now());
            }
        };
        this.waitForPvpOpponentToAccept = async () => {
            if(!goblinBase.matchmakingConfig){
                throw new ErrorResponse(716, 'Not implemented')
            } else if(!internalStuff.allowToMatchmake){
                throw new ErrorResponse(717, 'Matchmaking is not allowed')
            } else {
                return realtimeMatchmakingApi.waitForPvpOpponentToAccept(argv._pid, _.now());
            }
        };
        this.declinePvpMatch = async () => {
            if(!goblinBase.matchmakingConfig){
                throw new ErrorResponse(882, 'Not implemented')
            } else if(!internalStuff.allowToMatchmake){
                throw new ErrorResponse(883, 'Matchmaking is not allowed')
            } else {
                return realtimeMatchmakingApi.declinePvpMatch(argv._pid, _.now());
            }
        };
    }
}
class RuntimeVersionsHolder{
    constructor(){
        this.app = global.appVersion;
        this.node = process.versions.node;
        this.v8 = process.versions.v8;
        this.lodash = _.VERSION;
        this.env = global.envFlag;
    }
}

class CreateNewProfileResponse{
    constructor(profileBody){
        this.profileBody = profileBody;
    }
}
class MutateProfileResponse{
    constructor(profileBody){
        this.profileBody = profileBody;
    }
    asError(){
        this.silentError = this.profileBody;
        this.profileBody = undefined;
        return this;
    }
}
class PveInitResponse{
    constructor(theModel, objectToReturn){
        this.theModel = theModel;
        this.objectToReturn = objectToReturn;
    }
    asError(){
        if(this.theModel){
            throw new ErrorResponse(711, 'Can not set this response as error while battleModel is okay');
        } else {
            this.userRequestIsInvalid = true;
            return this;
        }
    }
}
class PveActResponse{
    constructor(gameIsOver, battleModel, objectToReturn){
        this.gameIsOver = gameIsOver;
        this.battleModel = battleModel;
        this.objectToReturn = objectToReturn;
    }
    asError(){
        if(this.gameIsOver){
            throw new ErrorResponse(713, 'Can not set this response as error while gameIsOver=true');
        } else {
            this.userRequestIsInvalid = true;
            return this;
        }
    }
}
class PveFinalizeResponse{
    constructor(battleJournalEntry){
        this.battleJournalEntry = battleJournalEntry;
    }
}
class FunctionResponse{
    constructor(objectToReturn){
        this.objectToReturn = objectToReturn;
    }
    asError(){
        this.userRequestIsInvalid = true;
        return this;
    }
}
class PvpResponse{
    constructor(responseObject){
        this.responseObject = responseObject;
    }
}
class PvpMessageHandler{
    constructor(modifiedModel, messageForOpponentA, messageForOpponentB){
        this.modifiedModel = modifiedModel;
        this.messageForOpponentA = messageForOpponentA;
        this.messageForOpponentB = messageForOpponentB;
    }
}
class PvpConnectionHandler{
    constructor(messageForConnectedPlayer, messageForOpponentPlayer){
        this.messageForConnectedPlayer = messageForConnectedPlayer;
        this.messageForOpponentPlayer = messageForOpponentPlayer;
    }
}
class PvpDisconnectionHandler{
    constructor(messageForConnectedOpponent){
        this.messageForConnectedOpponent = messageForConnectedOpponent;
    }
}
class PvpAutoDefeatResponse{
    constructor(responseA, responseB){
        this.responseA = responseA;
        this.responseB = responseB;
    }
}
class OnMatchmakingResponse{
    constructor(segment, strategy, mmDetails){
        this.segment = segment;
        this.strategy = strategy;
        this.mmDetails = mmDetails;
    }
    asError(){
        this.silentError = this.segment;
        this.segment = undefined;
        this.strategy = undefined;
        this.mmDetails = undefined;
        return this;
    }
}

module.exports = {
    InternalStuff,
    AllTheStuff,
    TheArgv,
    BattleJournalPve,
    BattleJournalPvp,

    ProfileNode,
    PublicProfileNode,
    RatingNode,

    Matchmaking,

    CreateNewProfileResponse,
    MutateProfileResponse,
    PveInitResponse,
    PveActResponse,
    PveFinalizeResponse,
    FunctionResponse,
    PvpResponse,
    PvpMessageHandler,
    PvpConnectionHandler,
    PvpDisconnectionHandler,
    PvpAutoDefeatResponse,
    OnMatchmakingResponse
};