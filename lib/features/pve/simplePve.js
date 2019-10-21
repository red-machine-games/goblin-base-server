'use strict';

module.exports = {
    beginPve,
    actPve,
    checkPveBattleDebt
};

const goblinBase = require('../../../index.js').getGoblinBase(),
    log = goblinBase.logsHook;

var _ = require('lodash'),
    jsonpack = require('jsonpack'),
    crc32 = require('crc-32');

var sessionKeeper = require('../../webMiddleware/sessionKeeper.js'),
    opClients = require('../../operativeSubsystem/opClients.js'),
    CF_EntryPoint = require('../cloudFunctions/CF_EntryPoint.js');

var ErrorResponse = require('../../objects/ErrorResponse.js'),
    ErrorResponseWithCode = require('../../objects/ErrorResponseWithCode.js');

var pveBattleTimeout, pveBattleDebtTimeout;

if(goblinBase.simplePveConfig){
    pveBattleTimeout = goblinBase.simplePveConfig.pveBattleTimeout;
    pveBattleDebtTimeout = goblinBase.simplePveConfig.pveBattleDebtTimeout;
}

function beginPve(customParams, sessionObject, clientPlatform, clientVersion, callback){
    var now = _.now(), theModel, output, codeToReturn = 200,
        subsessionHash;

    function checkSession(){
        if(sessionObject.aid && sessionObject.pcrd && sessionObject.pid && sessionObject.hid){
            checkAlreadyPveBattling();
        } else {
            tryToDestroyAbandonedSession();
        }
    }
    function tryToDestroyAbandonedSession(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 608, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(400, new ErrorResponse(609, 'Get or create profile first'));
        };

        sessionKeeper.destroySession(sessionObject, callbackFn);
    }
    function checkAlreadyPveBattling(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 610, err: { code: err.code, command: err.command, message: err.message } });
                justUnlockSession(500, new ErrorResponse(610, 'OP Error'));
            } else if(response){
                justUnlockSession(400, new ErrorResponse(611, 'Already PVE battling'));
            } else {
                runBattleInitialization();
            }
        };

        opClients.getSimpleGameplayClient().getRedis().exists(`me:${sessionObject.pid}`, callbackFn);
    }
    function runBattleInitialization(){
        let callbackFn = (err, response) => {
            if(err){
                if(err instanceof ErrorResponseWithCode){
                    justUnlockSession(err.code, err.getWithoutCode());
                } else {
                    justUnlockSession(500, err);
                }
            } else if(response){
                output = response.objectToReturn;
                if(response.theModel){
                    theModel = goblinBase.simplePveConfig.packJsonModel
                        ? jsonpack.pack(response.theModel)
                        : JSON.stringify(response.theModel);
                    codeToReturn = response.userRequestIsInvalid ? 400 : 200;
                    pushBattleModelToOP();
                } else {
                    justUnlockSession(400, output || new ErrorResponse(693, `Battle did not begin`));
                }
            } else {
                justUnlockSession(501, new ErrorResponse(694, `PVE lib didn\'t make a model`));
            }
        };

        if(goblinBase.cloudFunctionsConfig && goblinBase.cloudFunctionsConfig.customSession){
            subsessionHash = crc32.str(JSON.stringify(sessionObject.subs) || '');
        }
        CF_EntryPoint.pveInit(
            sessionObject.pid, sessionObject.hid, now, sessionObject.subs, customParams,
            clientPlatform, clientVersion, sessionObject, callbackFn
        );
    }
    function pushBattleModelToOP(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 619, err: { code: err.code, command: err.command, message: err.message } });
                justUnlockSession(500, new ErrorResponse(619, 'OP Error'));
            } else if(response){
                if(subsessionHash){
                    flushSession();
                } else {
                    justUnlockSession(codeToReturn, output);
                }
            } else {
                justUnlockSession(400, new ErrorResponse(620, 'Already PVE battling'));
            }
        };

        opClients.getSimpleGameplayClient().addNewBattleModel([sessionObject.pid, theModel, pveBattleTimeout, pveBattleDebtTimeout], callbackFn);
    }
    function flushSession(){
        let callbackFn = err => {
            if (err) {
                log.error('OP Error', {code: 695, err: {code: err.code, command: err.command, message: err.message}});
                tryToDestroyAbandonedSession();
            } else {
                callback(codeToReturn, output);
            }
        };

        var newSubsessionHash = crc32.str(JSON.stringify(sessionObject.subs) || '');
        sessionKeeper.flushSession(
            null, sessionObject, subsessionHash !== newSubsessionHash ? sessionObject.subs : null, callbackFn
        );
    }
    function justUnlockSession(code, response, noResponse){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 621, err: { code: err.code, command: err.command, message: err.message } });
            }
            if(!noResponse){
                callback(code, response);
            }
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkSession();
}
function actPve(sessionObject, clientParams, clientPlatform, clientVersion, callback){
    var now = _.now(),
        theBattleModel, subsessionHash,
        output;

    function checkSession(){
        if(sessionObject.aid && sessionObject.pcrd && sessionObject.pid && sessionObject.hid){
            getPveBattleModel();
        } else {
            tryToDestroyAbandonedSession();
        }
    }
    function tryToDestroyAbandonedSession(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 622, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(400, new ErrorResponse(623, 'Get or create profile first'));
        };

        sessionKeeper.destroySession(sessionObject, callbackFn);
    }
    function getPveBattleModel(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 624, err: { code: err.code, command: err.command, message: err.message } });
                justUnlockSession(500, new ErrorResponse(624, 'OP Error'));
            } else if(response){
                theBattleModel = goblinBase.simplePveConfig.packJsonModel
                    ? jsonpack.unpack(response)
                    : JSON.parse(response);
                runCustomActorCode();
            } else {
                justUnlockSession(400, new ErrorResponse(625, 'No PVE battling'));
            }
        };

        opClients.getSimpleGameplayClient().getBattleModel([sessionObject.pid, pveBattleTimeout], callbackFn);
    }
    function runCustomActorCode(){
        let callbackFn = (err, response) => {
            if(err){
                if(err instanceof ErrorResponseWithCode){
                    justUnlockSession(err.code, err.getWithoutCode());
                } else {
                    justUnlockSession(500, err);
                }
            } else if(response){
                output = response.objectToReturn;
                if(response.gameIsOver){
                    theBattleModel = response.battleModel || theBattleModel;
                    runCustomFinalizerCode();
                } else if(response.battleModel){
                    theBattleModel = response.battleModel;
                    pushModifiedBattleModelToOP();
                } else {
                    justUnlockSession(response.userRequestIsInvalid ? 400 : 200, output);
                }
            } else {
                justUnlockSession(501, new ErrorResponse(696, `Some PVE functions are not implemented`));
            }
        };

        CF_EntryPoint.pveAct(
            sessionObject.pid, sessionObject.hid, now, theBattleModel, clientParams,
            clientPlatform, clientVersion, sessionObject,
            callbackFn
        );
    }
    function runCustomFinalizerCode(){
        let callbackFn = (err, response) => {
            if(err){
                if(err instanceof ErrorResponseWithCode){
                    justUnlockSession(err.code, err.getWithoutCode());
                } else {
                    justUnlockSession(500, err);
                }
            } else if(response){
                unloadBattleModelFromOP();
            } else {
                justUnlockSession(501, new ErrorResponse(697, `Some PVE functions are not implemented`));
            }
        };

        if(goblinBase.cloudFunctionsConfig && goblinBase.cloudFunctionsConfig.customSession){
            subsessionHash = crc32.str(JSON.stringify(sessionObject.subs) || '');
        }
        CF_EntryPoint.pveFinalize(
            sessionObject.pid, sessionObject.hid, now, theBattleModel, sessionObject.subs, clientParams,
            clientPlatform, clientVersion, sessionObject, callbackFn
        );
    }
    function unloadBattleModelFromOP(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 631, err: { code: err.code, command: err.command, message: err.message } });
                justUnlockSession(500, new ErrorResponse(631, 'OP Error'));
            } else {
                tryToUpdateSubsession();
            }
        };

        opClients.getSimpleGameplayClient().unloadBattleModel([sessionObject.pid], callbackFn);
    }
    function tryToUpdateSubsession(){
        if(subsessionHash){
            flushSession();
        } else {
            justUnlockSession(200, output);
        }
    }
    function pushModifiedBattleModelToOP(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 636, err: { code: err.code, command: err.command, message: err.message } });
                justUnlockSession(500, new ErrorResponse(636, 'OP Error'));
            } else if(response){
                justUnlockSession(200, output);
            } else {
                justUnlockSession(400, new ErrorResponse(637, 'No PVE battling'));
            }
        };

        theBattleModel = goblinBase.simplePveConfig.packJsonModel
            ? jsonpack.pack(theBattleModel)
            : JSON.stringify(theBattleModel);
        opClients.getSimpleGameplayClient()
            .updateBattleModel([sessionObject.pid, theBattleModel, pveBattleTimeout], callbackFn);
    }
    function flushSession() {
        let callbackFn = err => {
            if (err) {
                log.error('OP Error', {code: 698, err: {code: err.code, command: err.command, message: err.message}});
                tryToDestroyAbandonedSession();
            } else {
                callback(200, output);
            }
        };

        var newSubsessionHash = crc32.str(JSON.stringify(sessionObject.subs) || '');
        sessionKeeper.flushSession(
            null, sessionObject, subsessionHash !== newSubsessionHash ? sessionObject.subs : null, callbackFn
        );
    }
    function justUnlockSession(code, response, noResponse){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 638, err: { code: err.code, command: err.command, message: err.message } });
            }
            if(!noResponse){
                callback(code, response);
            }
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkSession();
}
function checkPveBattleDebt(playerPid, callback) {
    let callbackFn = (err, response) => {
        if(err){
            log.error('OP Error', { code: 930, err: { code: err.code, command: err.command, message: err.message } });
            callback(new ErrorResponse(930, 'OP Error'));
        } else {
            callback(null, !!response);
        }
    };

    opClients.getSimpleGameplayClient().getBattleDebt([playerPid], callbackFn);
}