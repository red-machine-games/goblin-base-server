'use strict';

const INIT_CONTEXT_FUNCTION = 'initContext',
    CREATE_NEW_PROFILE_FUNCTION = 'createNewProfile',
    MUTATE_PROFILE_FUNCTION = 'mutateProfile',
    ON_GET_PROFILE_FUNCTION = 'onGetProfile',
    PVE_INIT_FUNCTION = 'pveInit',
    PVE_ACT_FUNCTION = 'pveAct',
    PVE_FINALIZE_FUNCTION = 'pveFinalize',
    PVP_GENERATE_PAYLOAD = 'pvpGeneratePayload',
    PVP_INIT_GAMEPLAY_MODEL = 'pvpInitGameplayModel',
    PVP_CONNECTION_HANDLER = 'pvpConnectionHandler',
    PVP_DISCONNECTION_HANDLER = 'pvpDisconnectionHandler',
    PVP_TURN_HANDLER = 'pvpTurnHandler',
    PVP_CHECK_GAME_OVER = 'pvpCheckGameOver',
    PVP_GAME_OVER_HANDLER = 'pvpGameOverHandler',
    PVP_AUTO_CLOSE_HANDLER = 'pvpAutoCloseHandler',
    ON_MATCHMAKING = 'onMatchmaking';

const ON_CYCLIC_ROUND = 'onCyclicRound',
    ON_CUSTOM_AUTH = 'onCustomAuth',
    ON_SET_ATOMIC_OBJECT = 'onSetAtomicObject',
    PVP_ON_ENTER_FRAME = 'pvpOnEnterFrame',
    PVP_ON_EXIT_FRAME = 'pvpOnExitFrame';

module.exports = {
    status,
    createNewProfile,
    mutateProfile,
    onGetProfile,
    checkCustomActPresence,
    runCustomAct,
    pveInit,
    pveAct,
    pveFinalize,
    checkPvpGeneratePayloadPresence,
    pvpGeneratePayload,
    pvpInitGameplayModel,
    pvpConnectionHandler,
    pvpDisconnectionHandler,
    checkPvpDisconnectionHandlerPresence,
    pvpTurnHandler,
    pvpCheckGameOver,
    pvpGameOverHandler,
    pvpAutoCloseHandler,
    onMatchmaking,

    INIT_CONTEXT_FUNCTION,
    CREATE_NEW_PROFILE_FUNCTION,
    MUTATE_PROFILE_FUNCTION,
    ON_GET_PROFILE_FUNCTION,
    PVE_INIT_FUNCTION,
    PVE_ACT_FUNCTION,
    PVE_FINALIZE_FUNCTION,
    PVP_GENERATE_PAYLOAD,
    PVP_INIT_GAMEPLAY_MODEL,
    PVP_CONNECTION_HANDLER,
    PVP_DISCONNECTION_HANDLER,
    PVP_TURN_HANDLER,
    PVP_CHECK_GAME_OVER,
    PVP_GAME_OVER_HANDLER,
    PVP_AUTO_CLOSE_HANDLER,
    ON_MATCHMAKING,

    ON_CYCLIC_ROUND,
    ON_CUSTOM_AUTH,
    ON_SET_ATOMIC_OBJECT,
    PVP_ON_ENTER_FRAME,
    PVP_ON_EXIT_FRAME
};

var theCloudCode;

var ErrorResponse = require('../../objects/ErrorResponse.js');

function _theCloudCode(){
    if(!theCloudCode){
        theCloudCode = require('./CF_Code.js');
    }
    return theCloudCode;
}

function status(){
    return _theCloudCode().status();
}
function createNewProfile(now, clientPlatform, clientVersion, sessionObject, callback){
    if(_theCloudCode().checkFunctionPresence(CREATE_NEW_PROFILE_FUNCTION)){
        _theCloudCode().runCustomFunction(
            CREATE_NEW_PROFILE_FUNCTION, null, null, now, false, false, false, false, false, null, null,
            null, false, clientPlatform, clientVersion, sessionObject, undefined, false, 0, callback
        );
    } else {
        callback(null, null);
    }
}
function mutateProfile(theLock, now, clientPlatform, clientVersion, pid, humanId, sessionObject, callback){
    if(_theCloudCode().checkFunctionPresence(MUTATE_PROFILE_FUNCTION)){
        _theCloudCode().runCustomFunction(
            MUTATE_PROFILE_FUNCTION, humanId || sessionObject.hid, pid || sessionObject.pid, now,
            true, false, false, false, true, null, { clientPlatform, clientVersion }, null, false,
            clientPlatform, clientVersion, sessionObject, theLock, false, 0, callback
        );
    } else {
        callback(null, null);
    }
}
function onGetProfile(now, pid, hid, sessionData, clientPlatform, clientVersion, sessionObject, callback){
    if(_theCloudCode().checkFunctionPresence(ON_GET_PROFILE_FUNCTION)){
        _theCloudCode().runCustomFunction(
            ON_GET_PROFILE_FUNCTION, hid || sessionObject.hid, pid || sessionObject.pid, now, true, true,
            false, false, false, sessionData, { clientPlatform, clientVersion }, null, false, clientPlatform, clientVersion,
            sessionObject, undefined, false, 0, callback
        );
    } else {
        callback(null, null);
    }
}
function checkCustomActPresence(functionName, callback){
    if(_theCloudCode().isNotFixedFunction(functionName)){
        callback(null, _theCloudCode().checkFunctionPresence(functionName));
    } else {
        callback(null, false);
    }
}
function runCustomAct(pid, hid, now, functionName, sessionData, clientParams, clientPlatform,
                      clientVersion, sessionObject, callback){
    _theCloudCode().runCustomFunction(
        functionName, hid, pid, now, true, true, true, true, false, sessionData, { clientPlatform, clientVersion },
        clientParams, false, clientPlatform, clientVersion, sessionObject, undefined, false, 0, callback
    );
}
function pveInit(pid, hid, now, sessionData, clientParams, clientPlatform, clientVersion, sessionObject, callback){
    if(_theCloudCode().checkFunctionPresence(PVE_INIT_FUNCTION)
            && _theCloudCode().checkFunctionPresence(PVE_ACT_FUNCTION)
            && _theCloudCode().checkFunctionPresence(PVE_FINALIZE_FUNCTION)){
        _theCloudCode().runCustomFunction(
            PVE_INIT_FUNCTION, hid, pid, now, true, true, true, true, false, sessionData, { clientPlatform, clientVersion },
            clientParams, false, clientPlatform, clientVersion, sessionObject, undefined, false, 0, callback
        );
    } else {
        callback(new ErrorResponse(654, 'Some PVE functions are not implemented'), null);
    }
}
function pveAct(pid, hid, now, battleModel, clientParams, clientPlatform, clientVersion, sessionObject, callback){
    if(_theCloudCode().checkFunctionPresence(PVE_ACT_FUNCTION)
            && _theCloudCode().checkFunctionPresence(PVE_FINALIZE_FUNCTION)){
        _theCloudCode().runCustomFunction(
            PVE_ACT_FUNCTION, pid, hid, now, false, false, false, false, false, null,
            { clientPlatform, clientVersion, battleModel }, clientParams, false, clientPlatform, clientVersion,
            sessionObject, undefined, false, 0, callback
        );
    } else {
        callback(new ErrorResponse(655, 'Some PVE functions are not implemented'), null);
    }
}
function pveFinalize(pid, hid, now, battleModel, sessionData, clientParams, clientPlatform, clientVersion,
                     sessionObject, callback){
    if(_theCloudCode().checkFunctionPresence(PVE_FINALIZE_FUNCTION)){
        _theCloudCode().runCustomFunction(
            PVE_FINALIZE_FUNCTION, hid, pid, now, true, true, true, false, false, sessionData,
            { clientPlatform, clientVersion, battleModel }, clientParams, false, clientPlatform, clientVersion,
            sessionObject, undefined, false, 0, callback
        );
    } else {
        callback(new ErrorResponse(603, 'Some PVE functions are not implemented'), null);
    }
}
function checkPvpGeneratePayloadPresence(){
    return _theCloudCode().checkFunctionPresence(PVP_GENERATE_PAYLOAD);
}
function pvpGeneratePayload(now, fromHumanId, fromObject, isA, isBot, clientSideParams, callback){
    if(_theCloudCode().checkFunctionPresence(PVP_GENERATE_PAYLOAD)
            && _theCloudCode().checkFunctionPresence(PVP_INIT_GAMEPLAY_MODEL)
            && _theCloudCode().checkFunctionPresence(PVP_CONNECTION_HANDLER)
            && _theCloudCode().checkFunctionPresence(PVP_TURN_HANDLER)
            && _theCloudCode().checkFunctionPresence(PVP_CHECK_GAME_OVER)
            && _theCloudCode().checkFunctionPresence(PVP_GAME_OVER_HANDLER)
            && _theCloudCode().checkFunctionPresence(PVP_AUTO_CLOSE_HANDLER)){
        _theCloudCode().runCustomFunction(
            PVP_GENERATE_PAYLOAD, fromHumanId, undefined, now, true, false, false, false, false, undefined,
            { fromHid: fromHumanId, fromObject, isA, isBot }, clientSideParams, false, undefined, undefined,
            undefined, undefined, false, 0, callback
        );
    } else {
        callback(new ErrorResponse(604, 'Some PVP functions are not implemented'), null);
    }
}
function pvpInitGameplayModel(now, pidA, pidB, payloadA, payloadB, randomSeed, callback){
    if(_theCloudCode().checkFunctionPresence(PVP_GENERATE_PAYLOAD)
            && _theCloudCode().checkFunctionPresence(PVP_INIT_GAMEPLAY_MODEL)
            && _theCloudCode().checkFunctionPresence(PVP_CONNECTION_HANDLER)
            && _theCloudCode().checkFunctionPresence(PVP_TURN_HANDLER)
            && _theCloudCode().checkFunctionPresence(PVP_CHECK_GAME_OVER)
            && _theCloudCode().checkFunctionPresence(PVP_GAME_OVER_HANDLER)
            && _theCloudCode().checkFunctionPresence(PVP_AUTO_CLOSE_HANDLER)){
        _theCloudCode().runCustomFunction(
            PVP_INIT_GAMEPLAY_MODEL, undefined, undefined, now, false, false, false, false, false, undefined,
            { pidA, pidB, payloadA, payloadB, randomSeed }, undefined, false, undefined, undefined, undefined,
            undefined, false, 0, callback
        );
    } else {
        callback(new ErrorResponse(605, 'Some PVP functions are not implemented'), null);
    }
}
function pvpConnectionHandler(now, theModel, isA, startTs, randomSeed, playerTurnA, playerTurnB, callback){
    if(_theCloudCode().checkFunctionPresence(PVP_CONNECTION_HANDLER)){
        _theCloudCode().runCustomFunction(
            PVP_CONNECTION_HANDLER, undefined, undefined, now, false, false, false, false, false, undefined,
            { theModel, isA, startTs, randomSeed, playerTurnA, playerTurnB }, undefined, false, undefined,
            undefined, undefined, undefined, false, 0, callback
        );
    } else {
        callback(null, null);
    }
}
function pvpDisconnectionHandler(now, theModel, disconnectedIsA, playerTurnA, playerTurnB, callback){
    if(_theCloudCode().checkFunctionPresence(PVP_DISCONNECTION_HANDLER)){
        _theCloudCode().runCustomFunction(
            PVP_DISCONNECTION_HANDLER, undefined, undefined, now, false, false, false, false, false, undefined,
            { theModel, disconnectedIsA, playerTurnA, playerTurnB }, undefined, false, undefined,
            undefined, undefined, undefined, false, 0, callback
        );
    } else {
        callback(null, null);
    }
}
function checkPvpDisconnectionHandlerPresence(){
    return _theCloudCode().checkFunctionPresence(PVP_DISCONNECTION_HANDLER);
}
function pvpTurnHandler(now, theModel, isA, theMessage, playerTurnA, playerTurnB, callback){
    if(_theCloudCode().checkFunctionPresence(PVP_TURN_HANDLER)){
        _theCloudCode().runCustomFunction(
            PVP_TURN_HANDLER, undefined, undefined, now, false, false, false, false, false, undefined,
            { theModel, isA, theMessage, playerTurnA, playerTurnB }, undefined, false, undefined,
            undefined, undefined, undefined, false, 0, callback
        );
    } else {
        callback(null, null);
    }
}
function pvpCheckGameOver(now, theModel, callback){
    if(_theCloudCode().checkFunctionPresence(PVP_CHECK_GAME_OVER)){
        _theCloudCode().runCustomFunction(
            PVP_CHECK_GAME_OVER, undefined, undefined, now, false, false, false, false, false, undefined,
            { theModel }, undefined, false, undefined, undefined, undefined, undefined, false, 0, callback
        );
    } else {
        callback(null, null);
    }
}
function pvpGameOverHandler(now, opponentIsBot, pidA, pidB, humanIdA, humanIdB, theModel, callback){
    if(_theCloudCode().checkFunctionPresence(PVP_GAME_OVER_HANDLER)){
        _theCloudCode().runCustomFunction(
            PVP_GAME_OVER_HANDLER, undefined, undefined, now, true, true, true, false, false, undefined,
            { opponentIsBot, pidA, pidB, theModel, playerA: humanIdA, playerB: humanIdB }, undefined, false,
            undefined, undefined, undefined, undefined, false, 0, callback
        );
    } else {
        callback(null, null);
    }
}
function pvpAutoCloseHandler(now, opponentIsBot, pidA, pidB, humanIdA, humanIdB, lagA, lagB, theModel, callback){
    if(_theCloudCode().checkFunctionPresence(PVP_AUTO_CLOSE_HANDLER)){
        _theCloudCode().runCustomFunction(
            PVP_AUTO_CLOSE_HANDLER, undefined, undefined, now, true, true, true, false, false, undefined,
            { opponentIsBot, pidA, pidB, lagA, lagB, theModel, playerA: humanIdA, playerB: humanIdB }, undefined,
            false, undefined, undefined, undefined, undefined, false, 0, callback
        );
    } else {
        callback(null, null);
    }
}
function onMatchmaking(now, pid, hid, sessionData, clientParams, clientPlatform, clientVersion, sessionObject, callback){
    if(_theCloudCode().checkFunctionPresence(ON_MATCHMAKING)){
        _theCloudCode().runCustomFunction(
            ON_MATCHMAKING, hid || sessionObject.hid, pid || sessionObject.pid, now, true, true,
            true, false, false, sessionData, { clientPlatform, clientVersion }, clientParams, false, clientPlatform, clientVersion,
            sessionObject, undefined, false, 0, callback
        );
    } else {
        callback(null, null);
    }
}