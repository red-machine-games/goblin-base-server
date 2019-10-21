'use strict';

const INIT_CONTEXT_FUNCTION = require('./CF_EntryPoint.js').INIT_CONTEXT_FUNCTION,
    CREATE_NEW_PROFILE_FUNCTION = require('./CF_EntryPoint.js').CREATE_NEW_PROFILE_FUNCTION,
    MUTATE_PROFILE_FUNCTION = require('./CF_EntryPoint.js').MUTATE_PROFILE_FUNCTION,
    ON_GET_PROFILE_FUNCTION = require('./CF_EntryPoint.js').ON_GET_PROFILE_FUNCTION,
    PVE_INIT_FUNCTION = require('./CF_EntryPoint.js').PVE_INIT_FUNCTION,
    PVE_ACT_FUNCTION = require('./CF_EntryPoint.js').PVE_ACT_FUNCTION,
    PVE_FINALIZE_FUNCTION = require('./CF_EntryPoint.js').PVE_FINALIZE_FUNCTION,
    PVP_GENERATE_PAYLOAD = require('./CF_EntryPoint.js').PVP_GENERATE_PAYLOAD,
    PVP_INIT_GAMEPLAY_MODEL = require('./CF_EntryPoint.js').PVP_INIT_GAMEPLAY_MODEL,
    PVP_CONNECTION_HANDLER = require('./CF_EntryPoint.js').PVP_CONNECTION_HANDLER,
    PVP_DISCONNECTION_HANDLER = require('./CF_EntryPoint.js').PVP_DISCONNECTION_HANDLER,
    PVP_TURN_HANDLER = require('./CF_EntryPoint.js').PVP_TURN_HANDLER,
    PVP_CHECK_GAME_OVER = require('./CF_EntryPoint.js').PVP_CHECK_GAME_OVER,
    PVP_GAME_OVER_HANDLER = require('./CF_EntryPoint.js').PVP_GAME_OVER_HANDLER,
    PVP_AUTO_CLOSE_HANDLER = require('./CF_EntryPoint.js').PVP_AUTO_CLOSE_HANDLER,
    PVP_FUNCTIONS_NAMES = [
        PVP_GENERATE_PAYLOAD,
        PVP_INIT_GAMEPLAY_MODEL,
        PVP_CONNECTION_HANDLER,
        PVP_DISCONNECTION_HANDLER,
        PVP_TURN_HANDLER,
        PVP_CHECK_GAME_OVER,
        PVP_GAME_OVER_HANDLER,
        PVP_AUTO_CLOSE_HANDLER
    ],
    ON_MATCHMAKING = require('./CF_EntryPoint.js').ON_MATCHMAKING,
    ON_CYCLIC_ROUND = require('./CF_EntryPoint.js').ON_CYCLIC_ROUND,
    ON_CUSTOM_AUTH = require('./CF_EntryPoint.js').ON_CUSTOM_AUTH,
    ON_SET_ATOMIC_OBJECT = require('./CF_EntryPoint.js').ON_SET_ATOMIC_OBJECT,
    PVP_ON_ENTER_FRAME = require('./CF_EntryPoint.js').PVP_ON_ENTER_FRAME,
    PVP_ON_EXIT_FRAME = require('./CF_EntryPoint.js').PVP_ON_EXIT_FRAME,
    RESERVED_CF_NAMES = [ON_CYCLIC_ROUND, ON_CUSTOM_AUTH, ON_SET_ATOMIC_OBJECT, PVP_ON_ENTER_FRAME, PVP_ON_EXIT_FRAME],
    FIXED_FUNCTIONS_NAMES = [
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
        ON_CYCLIC_ROUND,
        ON_CUSTOM_AUTH,
        ON_SET_ATOMIC_OBJECT,
        PVP_ON_ENTER_FRAME,
        PVP_ON_EXIT_FRAME,
        ON_MATCHMAKING
    ];

module.exports = {
    listCloudFunctions,
    insertNewFunctions,
    insertExtensions,

    shutdown,

    checkFunctionPresence,
    runCustomFunction,
    isNotFixedFunction,

    INIT_CONTEXT_FUNCTION,
    RESERVED_CF_NAMES
};

const goblinBase = require('../../../index.js').getGoblinBase(),
    log = goblinBase.logsHook;

const INT32_MAX = 2147483647;

const NEW_PROFILE_NODES_WHITELIST = require('./apiLayer/profileAndRatingsApi.js').NEW_PROFILE_NODES_CAN_BEGIN_ONLY_FROM
        .concat(require('../accountsAndProfiles/profiles.js').PROFILE_MODIFY_RESERVED_NODES_SECONDARY),
    SEGMENT_NAME_REGEXP = require('../leaderboards/leaderboards.js').SEGMENT_NAME_REGEXP;

var _ = require('lodash'),
    crc32 = require('crc-32');

var profileAndRatingsApi = require('./apiLayer/profileAndRatingsApi.js'),
    etcApi = require('./apiLayer/etcApi.js'),
    cfUtils = require('./utils/cfUtils.js'),
    cfLodash = require('./utils/cfLodash.js'),
    CfLoggerFacade = require('./utils/cfLog.js').CfLoggerFacade;

const CF_RUN_STACK_DEPTH = 12;

var InternalStuff = require('./CF_Classes.js').InternalStuff,
    AllTheStuff = require('./CF_Classes.js').AllTheStuff,
    TheArgv = require('./CF_Classes.js').TheArgv,
    BattleJournalPve = require('./CF_Classes.js').BattleJournalPve,
    BattleJournalPvp = require('./CF_Classes.js').BattleJournalPvp;

var CreateNewProfileResponse = require('./CF_Classes.js').CreateNewProfileResponse,
    MutateProfileResponse = require('./CF_Classes.js').MutateProfileResponse,
    PveInitResponse = require('./CF_Classes.js').PveInitResponse,
    PveActResponse = require('./CF_Classes.js').PveActResponse,
    PveFinalizeResponse = require('./CF_Classes.js').PveFinalizeResponse,
    FunctionResponse = require('./CF_Classes.js').FunctionResponse,
    PvpResponse = require('./CF_Classes.js').PvpResponse,
    PvpMessageHandler = require('./CF_Classes.js').PvpMessageHandler,
    PvpConnectionHandler = require('./CF_Classes.js').PvpConnectionHandler,
    PvpDisconnectionHandler = require('./CF_Classes.js').PvpDisconnectionHandler,
    PvpAutoDefeatResponse = require('./CF_Classes.js').PvpAutoDefeatResponse,
    OnMatchmakingResponse = require('./CF_Classes.js').OnMatchmakingResponse,
    ErrorResponse = require('../../objects/ErrorResponse.js');

var enableTraces;

var funcs,
    theGlobal,
    extensions, extensionsAPI;

if(goblinBase.cloudFunctionsConfig){
    enableTraces = goblinBase.cloudFunctionsConfig.enableTraces;
}

process.on('unhandledRejection : Promise !!!', reason => log.error('unhandledRejection', { message: reason.message, stack: reason.stack }));

function listCloudFunctions(){
    return _.keys(funcs);
}
function insertNewFunctions(leNewFuncs, callback){
    let doReinitContext = true;
    funcs = {};
    _.assign(funcs, leNewFuncs);
    if(doReinitContext){
        reinitContext(callback);
    } else {
        callback(null);
    }
}
function insertExtensions(_extensions){
    extensions = _extensions;
    extensionsAPI = new Proxy(extensions, {
        getOwnPropertyDescriptor: () => undefined,
        ownKeys: target => {
            if(target === extensions){
                return Object.keys(extensions);
            }
        },
        defineProperty: () => false,
        deleteProperty: () => false,
        preventExtensions: () => false,
        has: (target, name) => {
            if(target === extensions){
                return extensions.hasOwnProperty(name)
            }
        },
        get: (target, name, receiver) => {
            if(target === extensions && receiver === extensionsAPI && extensions.hasOwnProperty(name)){
                return extensions[name];
            }
        },
        set: () => false,
        apply: () => undefined,
        construct: () => undefined
    });
}
function reinitContext(callback){
    let callbackFn = (err, response) => {
        callback(err, response);
    };

    theGlobal = {};
    if(funcs[INIT_CONTEXT_FUNCTION]){
        runCustomFunction(
            INIT_CONTEXT_FUNCTION, undefined, undefined, undefined, false, false, false, false, false,
            undefined, undefined, undefined, true, undefined, undefined, undefined, undefined, false, 0, callbackFn
        );
    } else {
        callback(null);
    }
}
function shutdown(callback){
    callback();
}
function checkFunctionPresence(name){
    return funcs && !!funcs[name];
}
function runCustomFunction(name, humanId, pid, now, allowToAccessProfile, allowToAccessRecords, allowToAccessNotOnlySelf,
                           allowToMatchmake, isMutation, sessionData, args, clientParams, allowToDefineGlobal, clientPlatform,
                           clientVersion, sessionObject, theLock, isSubRun, subRunStackDepth, callback){
    var theCallback = (err, responseBody, traces) => {
        if(enableTraces && responseBody && responseBody.objectToReturn && traces && traces.length){
            responseBody.objectToReturn._traces = traces;
        }
        if(err){
            let clearErr = cfUtils.cleanObjectFromContext(err);
            if(clearErr.message !== err.message){
                clearErr = new ErrorResponse(1094, `Cloud function "${name}" runtime error (see cf.logs for details)`, { cfName: name });
            } else {
                clearErr.details = { cfName: name };
            }
            allTheStuff.log.error(err.message, clearErr);
            callback(clearErr);
        } else {
            callback(null, responseBody, traces);
        }
        if(allTheStuff.log){
            allTheStuff.log.persistLogs(_.now());
        }
    };
    var [allTheStuff, globalResolver] = buildAllTheStuff(
        _.now(), name, pid, humanId, args, sessionData, clientParams, allowToAccessProfile,
        allowToAccessRecords, allowToAccessNotOnlySelf, allowToDefineGlobal, allowToMatchmake, isMutation,
        clientPlatform, clientVersion, sessionObject, theLock, isSubRun, subRunStackDepth, theCallback
    );
    if(_.isFunction(funcs[name])){
        runAsPushedFunction(funcs[name], name, allTheStuff, globalResolver);
    } else {
        callback(new ErrorResponse(118, `Cloud function ${name} won't run: not found or invalid`));
    }
}
function runAsPushedFunction(theFunc, theFuncName, allTheStuff, globalResolver){
    if(goblinBase.cloudFunctionsConfig.enableSetTimeout){
        var theSetTimeout = setTimeout;
    }
    theFunc(
        allTheStuff.getProfileNode, allTheStuff.getSomeProfileNode, allTheStuff.getPublicProfileNode,
        allTheStuff.setProfileNode, allTheStuff.setSomeProfileNode, allTheStuff.getSelfRating,
        allTheStuff.setSelfRating, allTheStuff.getSomeonesRating, allTheStuff.setSomeonesRating,
        allTheStuff.getSelfRatings, allTheStuff.checkForBattleDebts, allTheStuff.matchmaking,
        allTheStuff.defineGlobal, allTheStuff.CreateNewProfileResponse, allTheStuff.MutateProfileResponse,
        allTheStuff.PveInitResponse, allTheStuff.PveActResponse, allTheStuff.PveFinalizeResponse,
        allTheStuff.FunctionResponse, allTheStuff.PvpResponse, allTheStuff.PvpMessageHandler, allTheStuff.PvpConnectionHandlerF,
        allTheStuff.PvpDisconnectionHandlerF, allTheStuff.PvpAutoDefeatResponse, allTheStuff.OnMatchmakingResponseF,
        allTheStuff.runtimeVersions, allTheStuff.selfHumanId, allTheStuff.now, allTheStuff.args, allTheStuff.session,
        allTheStuff.clientParams, allTheStuff.glob, allTheStuff.validateStoreReceipt, cfLodash.lodashProxy,
        cfLodash.sharingCodeUtilsProxy, goblinBase.cloudFunctionsConfig.resources, allTheStuff.trace,
        allTheStuff.appendBattleJournalPve, allTheStuff.appendSelfBattleJournalPve, allTheStuff.appendBattleJournalPvp,
        allTheStuff.lock, allTheStuff.relock, allTheStuff.checkIsBot, allTheStuff.run, allTheStuff.access,
        theSetTimeout, allTheStuff.log, extensionsAPI
    ).then(() => globalResolver(null)).catch(err => globalResolver(err));
}
function isNotFixedFunction(name){
    return !_.includes(FIXED_FUNCTIONS_NAMES, name);
}
function buildAllTheStuff(now, name, pid, humanId, args, sessionData, clientParams, allowToAccessProfile,
                          allowToAccessRecords, allowToAccessNotOnlySelf, allowToDefineGlobal, allowToMatchmake,
                          isMutation, clientPlatform, clientVersion, sessionObject, theLock, isSubRun, subRunStackDepth,
                          callback){
    async function returnCurrentLock(){
        if(!internalStuff.acquiredResourceLock){
            throw new ErrorResponse(885, 'No single lock acquired');
        } else if(isSubRun){
            throw new ErrorResponse(886, 'Cannot operate with lock from sub-run function');
        } else {
            await etcApi.returnResourcesLockPromise(internalStuff.acquiredResourceLock);
            internalStuff.acquiredResourceLock = undefined;
        }
    }
    async function selfLock(){
        if(!argv.selfHumanId){
            throw new ErrorResponse(887, 'No self human id: seems that this function is not related to some particular player')
        } else if(isSubRun){
            throw new ErrorResponse(711, 'Cannot operate with lock from sub-run function');
        } else {
            await onlySomeLock(argv.selfHumanId);
        }
    }
    async function selfAndSomeLock(){
        if(internalStuff.acquiredResourceLock){
            throw new ErrorResponse(713, 'Already acquired some lock');
        } else if(isSubRun){
            throw new ErrorResponse(718, 'Cannot operate with lock from sub-run function');
        } else {
            let hids = _.flattenDeep(arguments);
            if(allowToAccessNotOnlySelf || (!allowToAccessNotOnlySelf && (hids === argv.selfHumanId || (Array.isArray(hids) && hids.length === 1 && hids[0] === argv.selfHumanId)))){
                internalStuff.acquiredResourceLock = Array.isArray(hids)
                    ? await etcApi.lockResources(hids.concat([argv.selfHumanId]))
                    : await etcApi.lockResources([hids, argv.selfHumanId]);
            } else {
                throw new ErrorResponse(719, 'You can not access other players\' resources here');
            }
        }
    }
    async function onlySomeLock(){
        if(internalStuff.acquiredResourceLock){
            throw new ErrorResponse(720, 'Already acquired some lock');
        } else if(isSubRun){
            throw new ErrorResponse(721, 'Cannot operate with lock from sub-run function');
        } else {
            let hids = _.flattenDeep(arguments);
            if(allowToAccessNotOnlySelf || (!allowToAccessNotOnlySelf && (hids === argv.selfHumanId || (Array.isArray(hids) && hids.length === 1 && hids[0] === argv.selfHumanId)))){
                internalStuff.acquiredResourceLock = await etcApi.lockResources(hids);
            } else {
                throw new ErrorResponse(722, 'You can not access other players\' resources here');
            }
        }
    }
    function getLock(){
        return internalStuff.acquiredResourceLock ? internalStuff.acquiredResourceLock.listResources() : undefined;
    }
    async function getProfileNode(nodePath, skip, limit){
        if(!internalStuff.acquiredResourceLock){
            await selfLock();
        }
        return getSomeProfileNode(argv.selfHumanId, nodePath, skip, limit);
    }
    async function getSomeProfileNode(targetHumanId, nodePath, skip, limit){
        if(!internalStuff.allowToAccessProfile){
            throw new ErrorResponse(893, 'Profile access is not allowed');
        } else if(!internalStuff.acquiredResourceLock || !internalStuff.acquiredResourceLock.includes(targetHumanId)){
            throw new ErrorResponse(723, 'Cannot access this resource without lock');
        } else if(allowToAccessNotOnlySelf || (!allowToAccessNotOnlySelf && targetHumanId === argv.selfHumanId)){
            let pnodeKey = `${targetHumanId}-${nodePath}`,
                pnode = internalStuff.setOfProfileNodesToRead[pnodeKey];
            if(_.isUndefined(pnode)){
                pnode = (targetHumanId === argv.selfHumanId && argv._pid)
                    ? await profileAndRatingsApi.getProfileNode(argv._pid, nodePath, skip, limit, internalStuff.fakeProfileAccess)
                    : await profileAndRatingsApi.getProfileNodeWithHid(
                        internalStuff.acquiredResourceLock, targetHumanId, nodePath, skip, limit,
                        internalStuff.fakeProfileAccess, internalStuff.clientPlatform, internalStuff.clientVersion
                      );
                if(pnode === null){
                    throw new ErrorResponse(724, 'No such human id or node path');
                }
                internalStuff.setOfProfileNodesToRead[pnodeKey] = pnode;
            }
            return pnode.value;
        } else {
            throw new ErrorResponse(736, 'You can not access other players\' resources here');
        }
    }
    async function getPublicProfileNode(targetHumanId, nodePath, skip, limit){
        if(!internalStuff.allowToAccessProfile){
            throw new ErrorResponse(894, 'Profile access is not allowed')
        } else if(!internalStuff.acquiredResourceLock || !internalStuff.acquiredResourceLock.includes(targetHumanId)){
            throw new ErrorResponse(737, 'Cannot access this resource without lock');
        } else if(allowToAccessNotOnlySelf || (!allowToAccessNotOnlySelf && targetHumanId === argv.selfHumanId)){
            let pnodeKey = `${targetHumanId}-${nodePath}`,
                pnode = internalStuff.setOfPublicProfileNodesToRead[pnodeKey];
            if(_.isUndefined(pnode)){
                pnode = (targetHumanId === argv.selfHumanId && argv._pid)
                    ? await profileAndRatingsApi.getPublicProfileNode(argv._pid, nodePath, skip, limit, internalStuff.fakeProfileAccess)
                    : await profileAndRatingsApi.getPublicProfileNodeWithHid(
                        internalStuff.acquiredResourceLock, targetHumanId, nodePath, skip, limit,
                        internalStuff.fakeProfileAccess, internalStuff.clientPlatform, internalStuff.clientVersion
                      );
                if(pnode === null){
                }
                internalStuff.setOfPublicProfileNodesToRead[pnodeKey] = pnode;
            }
            return pnode.value;
        } else {
            throw new ErrorResponse(738, 'You can not access other players\' resources here');
        }
    }
    function setProfileNode(nodePath, value){
        value = cfUtils.cleanObjectFromContext(value);
        if(!internalStuff.allowToAccessProfile){
            throw new ErrorResponse(739, 'Profile access is not allowed');
        } else if(_.isNumber(value) && isNaN(value)){
            throw new ErrorResponse(740, 'Your value is NaN. Think you didn\'t mean it');
        } else {
            setSomeProfileNode(argv.selfHumanId, nodePath, value);
        }
    }
    function setSomeProfileNode(targetHumanId, nodePath, value){
        value = cfUtils.cleanObjectFromContext(value);
        if(!internalStuff.allowToAccessProfile){
            throw new ErrorResponse(895, 'Profile access is not allowed')
        } else if(_.isNumber(value) && isNaN(value)){
            throw new ErrorResponse(741, 'Your value is NaN. Think you didn\'t mean it');
        } else if(!internalStuff.acquiredResourceLock || !internalStuff.acquiredResourceLock.includes(targetHumanId)){
            throw new ErrorResponse(742, 'Cannot access this resource without lock');
        } else if(allowToAccessNotOnlySelf || (!allowToAccessNotOnlySelf && targetHumanId === argv.selfHumanId)){
            let pnodeKey = `${targetHumanId}-${nodePath}`,
                pnode = internalStuff.setOfProfileNodes[pnodeKey];
            if(_.isUndefined(pnode)){
                _.each(internalStuff.setOfProfileNodes, (v, k) => {
                    if(pnodeKey.startsWith(k) || k.startsWith(pnodeKey)){
                        throw new ErrorResponse(896, `This path is conflicted with already set`);
                    }
                });
                pnode = (targetHumanId === argv.selfHumanId && argv._pid)
                    ? profileAndRatingsApi.makeNewNode(argv.selfHumanId, argv._pid, nodePath, internalStuff.fakeProfileAccess, isMutation)
                    : profileAndRatingsApi.makeNewNode(targetHumanId, undefined, nodePath, internalStuff.fakeProfileAccess, isMutation);
                internalStuff.setOfProfileNodes[pnodeKey] = pnode;
            }
            pnode.value = value;
        } else {
            throw new ErrorResponse(743, 'You can not access other players\' resources here');
        }
    }
    async function checkIsBot(targetHumanId){
        if(!internalStuff.allowToAccessProfile){
            throw new ErrorResponse(744, 'Profile access is not allowed')
        } else{
            return profileAndRatingsApi.checkIsBot(targetHumanId);
        }
    }
    async function getSelfRating(segment){
        if(!internalStuff.acquiredResourceLock){
            await selfLock();
        }
        if(!goblinBase.leaderboardsConfig){
            throw new ErrorResponse(897, 'Not implemented');
        } else if(!internalStuff.allowToAccessRecords){
            throw new ErrorResponse(898, 'Records access is not allowed')
        } else if(!internalStuff.acquiredResourceLock || !internalStuff.acquiredResourceLock.includes(argv.selfHumanId)){
            throw new ErrorResponse(745, 'Cannot access this resource without lock');
        } else {
            let rheader = `${argv.selfHumanId}-${segment}`,
                rnode = internalStuff.setOfRecordNodes[rheader];
            if(_.isUndefined(rnode)){
                rnode = await profileAndRatingsApi.getSelfRatingNode(argv._pid, segment, internalStuff.fakeProfileAccess);
                if(rnode === null){
                    throw new ErrorResponse(746, 'No such human id or segment');
                }
                internalStuff.setOfRecordNodes[rheader] = rnode;
            }
            return rnode.value;
        }
    }
    function setSelfRating(segment, value){
        if(!goblinBase.leaderboardsConfig){
            throw new ErrorResponse(747, 'Not implemented');
        } else if(!internalStuff.allowToAccessRecords){
            throw new ErrorResponse(748, 'Records access is not allowed')
        } else if(!internalStuff.acquiredResourceLock || !internalStuff.acquiredResourceLock.includes(argv.selfHumanId)){
            throw new ErrorResponse(749, 'Cannot access this resource without lock');
        } else if(_.isNumber(value) && isNaN(value)) {
            throw new ErrorResponse(750, 'Your value is NaN. Think you didn\'t mean it');
        } else if(!_.isString(segment) || value < -1 || value > INT32_MAX || !SEGMENT_NAME_REGEXP.test(segment)) {
            throw new ErrorResponse(783, 'Invalid input');
        } else if(goblinBase.leaderboardsConfig.whitelistSegments && !_.includes(goblinBase.leaderboardsConfig.whitelistSegments, segment)){
            throw new ErrorResponse(784, 'Unknown segment');
        } else {
            setSomeonesRating(argv.selfHumanId, segment, value);
        }
    }
    async function getSomeonesRating(targetHumanId, segment){
        if(!goblinBase.leaderboardsConfig){
            throw new ErrorResponse(901, 'Not implemented');
        } else if(!internalStuff.allowToAccessRecords){
            throw new ErrorResponse(902, 'Records access is not allowed')
        } else if(!internalStuff.acquiredResourceLock || !internalStuff.acquiredResourceLock.includes(targetHumanId)){
            throw new ErrorResponse(751, 'Cannot access this resource without lock');
        } else if(allowToAccessNotOnlySelf || (!allowToAccessNotOnlySelf && targetHumanId === argv.selfHumanId)){
            let rheader = `${targetHumanId}-${segment}`,
                rnode = internalStuff.setOfRecordNodes[rheader];
            if(_.isUndefined(rnode)){
                rnode = await profileAndRatingsApi.getSomeonesRatingNode(
                    internalStuff.acquiredResourceLock, targetHumanId, segment, internalStuff.fakeProfileAccess
                );
                if(rnode === null){
                    throw new ErrorResponse(752, 'No such human id or segment');
                }
                internalStuff.setOfRecordNodes[rheader] = rnode;
            }
            return rnode.value;
        } else {
            throw new ErrorResponse(753, 'You can not access other players\' resources here');
        }
    }
    function setSomeonesRating(targetHumanId, segment, value){
        if(!goblinBase.leaderboardsConfig){
            throw new ErrorResponse(899, 'Not implemented');
        } else if(!internalStuff.allowToAccessRecords){
            throw new ErrorResponse(900, 'Records access is not allowed')
        } else if(!internalStuff.acquiredResourceLock || !internalStuff.acquiredResourceLock.includes(targetHumanId)){
            throw new ErrorResponse(754, 'Cannot access this resource without lock');
        } else if(_.isNumber(value) && isNaN(value)){
            throw new ErrorResponse(755, 'Your value is NaN. Think you didn\'t mean it');
        } else if(!_.isString(segment) || value < -1 || value > INT32_MAX || !SEGMENT_NAME_REGEXP.test(segment)) {
            throw new ErrorResponse(1074, 'Invalid input');
        } else if(goblinBase.leaderboardsConfig.whitelistSegments && !_.includes(goblinBase.leaderboardsConfig.whitelistSegments, segment)){
            throw new ErrorResponse(782, 'Unknown segment');
        } else if(allowToAccessNotOnlySelf || (!allowToAccessNotOnlySelf && targetHumanId === argv.selfHumanId)){
            let rheader = `${targetHumanId}-${segment}`,
                rnode = internalStuff.setOfRecordNodes[rheader];
            if(_.isUndefined(rnode)){
                if(targetHumanId === argv.selfHumanId && argv._pid){
                    rnode = profileAndRatingsApi.addTheRatingNode(undefined, argv._pid, segment, internalStuff.fakeProfileAccess);
                } else {
                    rnode = profileAndRatingsApi.addTheRatingNode(targetHumanId, undefined, segment, internalStuff.fakeProfileAccess);
                }
                internalStuff.setOfRecordNodes[rheader] = rnode;
            } else if(rnode.thisOneIsReadOnly){
                rnode.thisOneIsReadOnly = false;
            }
            rnode.value = value;
        } else {
            throw new ErrorResponse(756, 'You can not access other players\' resources here');
        }
    }
    async function getSelfRatings(){
        if(!internalStuff.acquiredResourceLock){
            await selfLock();
        }
        if(!goblinBase.leaderboardsConfig){
            throw new ErrorResponse(903, 'Not implemented');
        } else if(!internalStuff.allowToAccessRecords){
            throw new ErrorResponse(904, 'Records access is not allowed')
        } else if(!internalStuff.acquiredResourceLock || !internalStuff.acquiredResourceLock.includes(argv.selfHumanId)){
            throw new ErrorResponse(757, 'Cannot access this resource without lock');
        } else {
            let knownRatingSegments = [];
            _.each(internalStuff.setOfRecordNodes, (__, k) => {
                if(k.startsWith(`${argv.selfHumanId}-`)){
                    knownRatingSegments.push(k);
                }
            });
            let rnodes = await profileAndRatingsApi.listAllRatings(argv._pid, argv.selfHumanId, knownRatingSegments, internalStuff.fakeProfileAccess);
            _.each(rnodes, (v, k) => internalStuff.setOfRecordNodes[`${argv.selfHumanId}-${k}`] = v);
            _.each(knownRatingSegments, segm => {
                var cachedR = internalStuff.setOfRecordNodes[`${argv.selfHumanId}-${segm}`];
                if(!_.isUndefined(cachedR)){
                    rnodes[cachedR.segment] = cachedR;
                }
            });
            if(_.size(rnodes)){
                let out = {};
                _.each(rnodes, (v, k) => out[k] = v.value);
                return out;
            } else {
                return {};
            }
        }
    }
    async function checkForBattleDebts(){
        return etcApi.checkForBattleDebts(argv._pid);
    }
    function CreateNewProfileResponseF(profileBody){
        if(_.isPromise(profileBody)){
            throw new ErrorResponse(758, 'One of the arguments seems to be a promise. Maybe you forgot "await" keyword');
        }
        profileBody = cfUtils.cleanObjectFromContext(profileBody);
        if(internalStuff.currentFuncToAct && internalStuff.currentFuncToAct !== CREATE_NEW_PROFILE_FUNCTION){
            throw new ErrorResponse(905, 'Wrong type of answer');
        } else {
            for(let k in profileBody){
                if(profileBody.hasOwnProperty(k) && !_.includes(NEW_PROFILE_NODES_WHITELIST, k)){
                    throw new ErrorResponse(906, 'Profile body contains unexpected root nodes');
                }
            }
            return internalStuff.objectToReturn = new CreateNewProfileResponse(profileBody);
        }
    }
    function MutateProfileResponseF(profileBodyOrSilentError){
        if(_.isPromise(profileBodyOrSilentError)){
            throw new ErrorResponse(759, 'One of the arguments seems to be a promise. Maybe you forgot "await" keyword');
        }
        profileBodyOrSilentError = cfUtils.cleanObjectFromContext(profileBodyOrSilentError);
        if(internalStuff.currentFuncToAct && internalStuff.currentFuncToAct !== MUTATE_PROFILE_FUNCTION){
            throw new ErrorResponse(907, 'Wrong type of answer');
        } else {
            return internalStuff.objectToReturn = new MutateProfileResponse(profileBodyOrSilentError);
        }
    }
    function PveInitResponseF(theModel, objectToReturn){
        if(_.isPromise(theModel) || _.isPromise(objectToReturn)){
            throw new ErrorResponse(760, 'One of the arguments seems to be a promise. Maybe you forgot "await" keyword');
        }
        theModel = cfUtils.cleanObjectFromContext(theModel);
        objectToReturn = cfUtils.cleanObjectFromContext(objectToReturn);
        if(internalStuff.currentFuncToAct && internalStuff.currentFuncToAct !== PVE_INIT_FUNCTION){
            throw new ErrorResponse(908, 'Wrong type of answer');
        } else {
            return internalStuff.objectToReturn = new PveInitResponse(theModel, objectToReturn);
        }
    }
    function PveActResponseF(gameIsOver, battleModel, objectToReturn){
        if(_.isPromise(gameIsOver) || _.isPromise(battleModel) || _.isPromise(objectToReturn)){
            throw new ErrorResponse(761, 'One of the arguments seems to be a promise. Maybe you forgot "await" keyword');
        }
        battleModel = cfUtils.cleanObjectFromContext(battleModel);
        objectToReturn = cfUtils.cleanObjectFromContext(objectToReturn);
        if(internalStuff.currentFuncToAct && internalStuff.currentFuncToAct !== PVE_ACT_FUNCTION){
            throw new ErrorResponse(909, 'Wrong type of answer');
        } else {
            return internalStuff.objectToReturn = new PveActResponse(gameIsOver, battleModel, objectToReturn);
        }
    }
    function PveFinalizeResponseF(battleJournalEntry){
        if(_.isPromise(battleJournalEntry)){
            throw new ErrorResponse(762, 'One of the arguments seems to be a promise. Maybe you forgot "await" keyword');
        }
        battleJournalEntry = cfUtils.cleanObjectFromContext(battleJournalEntry);
        if(internalStuff.currentFuncToAct && internalStuff.currentFuncToAct !== PVE_FINALIZE_FUNCTION){
            throw new ErrorResponse(910, 'Wrong type of answer');
        } else {
            return internalStuff.objectToReturn = new PveFinalizeResponse(battleJournalEntry);
        }
    }
    function FunctionResponseF(objectToReturn){
        if(_.isPromise(objectToReturn)){
            throw new ErrorResponse(763, 'One of the arguments seems to be a promise. Maybe you forgot "await" keyword');
        }
        objectToReturn = cfUtils.cleanObjectFromContext(objectToReturn);
        if(internalStuff.currentFuncToAct && _.includes(FIXED_FUNCTIONS_NAMES, internalStuff.currentFuncToAct)){
            throw new ErrorResponse(911, 'Wrong type of answer');
        } else {
            return internalStuff.objectToReturn = new FunctionResponse(objectToReturn);
        }
    }
    function PvpResponseF(objectToReturn){
        if(_.isPromise(objectToReturn)){
            throw new ErrorResponse(764, 'One of the arguments seems to be a promise. Maybe you forgot "await" keyword');
        }
        objectToReturn = cfUtils.cleanObjectFromContext(objectToReturn);
        if(internalStuff.currentFuncToAct
                && (!_.includes(PVP_FUNCTIONS_NAMES, internalStuff.currentFuncToAct)
                || internalStuff.currentFuncToAct === PVP_AUTO_CLOSE_HANDLER)){
            throw new ErrorResponse(765, 'Wrong type of answer');
        } else {
            return internalStuff.objectToReturn = new PvpResponse(objectToReturn);
        }
    }
    function PvpMessageHandlerF(modifiedModel, messageForOpponentA, messageForOpponentB){
        if(_.isPromise(modifiedModel) || _.isPromise(messageForOpponentA) || _.isPromise(messageForOpponentB)){
            throw new ErrorResponse(766, 'One of the arguments seems to be a promise. Maybe you forgot "await" keyword');
        }
        modifiedModel = cfUtils.cleanObjectFromContext(modifiedModel);
        messageForOpponentA = cfUtils.cleanObjectFromContext(messageForOpponentA);
        messageForOpponentB = cfUtils.cleanObjectFromContext(messageForOpponentB);
        if(internalStuff.currentFuncToAct && internalStuff.currentFuncToAct !== PVP_TURN_HANDLER){
            throw new ErrorResponse(767, 'Wrong type of answer');
        } else {
            return internalStuff.objectToReturn = new PvpMessageHandler(modifiedModel, messageForOpponentA, messageForOpponentB);
        }
    }
    function PvpConnectionHandlerF(messageForConnectedPlayer, messageForOpponentPlayer){
        if(_.isPromise(messageForConnectedPlayer) || _.isPromise(messageForOpponentPlayer)){
            throw new ErrorResponse(768, 'One of the arguments seems to be a promise. Maybe you forgot "await" keyword');
        }
        messageForConnectedPlayer = cfUtils.cleanObjectFromContext(messageForConnectedPlayer);
        messageForOpponentPlayer = cfUtils.cleanObjectFromContext(messageForOpponentPlayer);
        if(internalStuff.currentFuncToAct && internalStuff.currentFuncToAct !== PVP_CONNECTION_HANDLER){
            throw new ErrorResponse(769, 'Wrong type of answer');
        } else {
            return internalStuff.objectToReturn = new PvpConnectionHandler(messageForConnectedPlayer, messageForOpponentPlayer);
        }
    }
    function PvpDisconnectionHandlerF(messageForConnectedOpponent){
        if(_.isPromise(messageForConnectedOpponent)){
            throw new ErrorResponse(770, 'One of the arguments seems to be a promise. Maybe you forgot "await" keyword');
        }
        messageForConnectedOpponent = cfUtils.cleanObjectFromContext(messageForConnectedOpponent);
        if(internalStuff.currentFuncToAct && internalStuff.currentFuncToAct !== PVP_DISCONNECTION_HANDLER){
            throw new ErrorResponse(771, 'Wrong type of answer');
        } else {
            return internalStuff.objectToReturn = new PvpDisconnectionHandler(messageForConnectedOpponent);
        }
    }
    function PvpAutoDefeatResponseF(messageForOpponentA, messageForOpponentB){
        if(_.isPromise(messageForOpponentA) || _.isPromise(messageForOpponentB)){
            throw new ErrorResponse(772, 'One of the arguments seems to be a promise. Maybe you forgot "await" keyword');
        }
        messageForOpponentA = cfUtils.cleanObjectFromContext(messageForOpponentA);
        messageForOpponentB = cfUtils.cleanObjectFromContext(messageForOpponentB);
        if(internalStuff.currentFuncToAct && internalStuff.currentFuncToAct !== PVP_AUTO_CLOSE_HANDLER){
            throw new ErrorResponse(773, 'Wrong type of answer');
        } else {
            return internalStuff.objectToReturn = new PvpAutoDefeatResponse(messageForOpponentA, messageForOpponentB);
        }
    }
    function OnMatchmakingResponseF(segment, strategy, mmDetails){
        if(_.isPromise(segment) || _.isPromise(strategy) || _.isPromise(mmDetails)){
            throw new ErrorResponse(385, 'One of the arguments seems to be a promise. Maybe you forgot "await" keyword');
        }
        segment = cfUtils.cleanObjectFromContext(segment);
        strategy = cfUtils.cleanObjectFromContext(strategy);
        mmDetails = cfUtils.cleanObjectFromContext(mmDetails);
        if(internalStuff.currentFuncToAct && internalStuff.currentFuncToAct !== ON_MATCHMAKING){
            throw new ErrorResponse(370, 'Wrong type of answer');
        } else {
            return internalStuff.objectToReturn = new OnMatchmakingResponse(segment, strategy, mmDetails);
        }
    }
    function defineGlobal(variableName, theValue){
        if(!internalStuff.allowToDefineGlobal){
            throw new ErrorResponse(912, 'Not allowed to define global here');
        } else {
            theGlobal[variableName] = cfUtils.cleanObjectFromContext(theValue);
        }
    }
    async function validateStoreReceipt(receiptBody){
        if(!internalStuff.acquiredResourceLock){
            await selfLock();
        }
        if(!internalStuff.acquiredResourceLock || !internalStuff.acquiredResourceLock.includes(argv.selfHumanId)){
            throw new ErrorResponse(774, 'Cannot access thisresource without lock');
        } else {
            var result = await etcApi.validateStoreReceipt(
                argv._pid, internalStuff.clientPlatform, cfUtils.cleanObjectFromContext(receiptBody),
                internalStuff.fakeIapValidation
            );
            if(result.receiptEntryBody){
                internalStuff.receipts.push(result.receiptEntryBody);
                delete result.receiptEntryBody;
            }
            return result;
        }
    }
    function appendSelfBattleJournalPve(theData){
        appendBattleJournalPve(argv.selfHumanId, cfUtils.cleanObjectFromContext(theData));
    }
    function appendBattleJournalPve(targetHumanId, theData){
        if(!goblinBase.simplePveConfig){
            throw new ErrorResponse(775, 'Pve is not enabled');
        } else if(allowToAccessNotOnlySelf || (!allowToAccessNotOnlySelf && targetHumanId === argv.selfHumanId)){
            theData = cfUtils.cleanObjectFromContext(theData);
            internalStuff.battleJournalEntries.push(
                (targetHumanId === argv.selfHumanId && argv._pid)
                    ? new BattleJournalPve(-1, undefined, argv._pid, theData, now)
                    : new BattleJournalPve(-1, targetHumanId, undefined, theData, now)
            );
        } else {
            throw new ErrorResponse(776, 'You can not access other players\' resources here');
        }
    }
    function appendBattleJournalPvp(theData, isAuto, doNotPersistOpponent){
        if(allTheStuff.args.pidA && (allTheStuff.args.pidB || allTheStuff.args.opponentIsBot)){
            theData = cfUtils.cleanObjectFromContext(theData);
            internalStuff.battleJournalEntries.push(
                new BattleJournalPvp(
                    -1, undefined, undefined, !!isAuto,
                    allTheStuff.args.pidA,
                    doNotPersistOpponent ? undefined : allTheStuff.args.pidB,
                    theData, now
                )
            );
        } else {
            throw new ErrorResponse(777, 'Pvp journal is undesirable here');
        }
    }
    async function run(functionName, functionArguments){
        if(subRunStackDepth >= CF_RUN_STACK_DEPTH){
            throw new ErrorResponse(1079, 'Max CF stack depth exceed');
        } else if(FIXED_FUNCTIONS_NAMES.includes(functionName)){
            throw new ErrorResponse(778, 'Cannot run fixed function from within a function');
        } else {
            return etcApi.runAnotherCustomFunction(
                functionName, humanId, pid, now, allowToAccessProfile, allowToAccessRecords, allowToAccessNotOnlySelf,
                allowToMatchmake, isMutation, sessionData, cfUtils.cleanObjectFromContext(functionArguments),
                clientParams, allowToDefineGlobal, clientPlatform, clientVersion, sessionObject,
                internalStuff.acquiredResourceLock, subRunStackDepth
            );
        }
    }
    function accessOnlyInternal(){
        if(!FIXED_FUNCTIONS_NAMES.includes(name) && !isSubRun){
            throw new ErrorResponse(779, 'This function can be accessed only from internal');
        }
    }
    function accessOnlyExternal(){
        if(!FIXED_FUNCTIONS_NAMES.includes(name) && isSubRun){
            throw new ErrorResponse(780, 'This function can be accessed only from external');
        }
    }
    function globalResolver(errArg){
        var gotReceipts, gotBJE;

        function checkProfileNodes(){
            _.each(internalStuff.setOfProfileNodes, (pnode, k) => {
                if(pnode.fakeProfileAccess || pnode.readOnly){
                    delete internalStuff.setOfProfileNodes[k];
                } else {
                    let needToDeleteThis = !pnode.hasBeenModified;
                    if(needToDeleteThis && pnode.isNotSimple){
                        needToDeleteThis = crc32.str(JSON.stringify(pnode.value) || '') === pnode.valueHash;
                    }
                    if(needToDeleteThis){
                        delete internalStuff.setOfProfileNodes[k];
                    }
                }
            });
            checkRecords();
        }
        function checkRecords(){
            _.each(internalStuff.setOfRecordNodes, (rnode, k) => {
                if(rnode.fakeProfileAccess || rnode.value === rnode.originalValue || rnode.thisOneIsReadOnly){
                    delete internalStuff.setOfRecordNodes[k];
                }
            });
            moreChecks();
        }
        function moreChecks(){
            gotReceipts = (internalStuff.receipts && internalStuff.receipts.length && !internalStuff.fakeIapValidation);
            gotBJE = (internalStuff.battleJournalEntries && internalStuff.battleJournalEntries.length);
            if(gotBJE){
                for(let i = 0; i < internalStuff.battleJournalEntries.length ; i++){
                    internalStuff.battleJournalEntries[i].cat = internalStuff.battleJournalEntries[i].cat + i;
                }
            }
            if(_.size(internalStuff.setOfProfileNodes) || _.size(internalStuff.setOfRecordNodes) || gotReceipts || gotBJE){
                processModifications();
            } else {
                tryToReturnResourceLock();
            }
        }
        function processModifications(){
            let callbackFn = err => tryToReturnResourceLock(err);

            let setOfProfileNodesValues = _.values(internalStuff.setOfProfileNodes),
                setOfRecordNodesValues = _.values(internalStuff.setOfRecordNodes),
                setOfProfileNodesForTheSame = _.allTheSame(setOfProfileNodesValues, e => [e.pid, e.humanId]),
                gotProfileNodes = (setOfProfileNodesValues && setOfProfileNodesValues.length && !internalStuff.fakeProfileAccess),
                gotRecords = !!(setOfRecordNodesValues && setOfRecordNodesValues.length && !internalStuff.fakeProfileAccess),
                onlyOneRecordByTheCaller =
                    gotRecords && setOfRecordNodesValues.length === 1 &&
                    (setOfRecordNodesValues[0].humanId === argv.selfHumanId || setOfRecordNodesValues[0].pid === argv._pid);

            if(setOfProfileNodesValues && !gotRecords && !gotReceipts && !gotBJE && setOfProfileNodesForTheSame){
                profileAndRatingsApi.tryToPersistOnlyProfileNodes(
                    internalStuff.acquiredResourceLock, argv._pid, setOfProfileNodesValues,
                    internalStuff.clientPlatform, internalStuff.clientVersion,
                    callbackFn
                );
            } else if(!gotProfileNodes && !gotReceipts && onlyOneRecordByTheCaller && !gotBJE){
                profileAndRatingsApi.tryToPersistOnlyOneRecord(
                    internalStuff.callerSessionObject, setOfRecordNodesValues[0], callbackFn
                );
            } else {
                profileAndRatingsApi.tryToPersistProfileNodesAtomicAct(
                    internalStuff.acquiredResourceLock, argv._pid, setOfProfileNodesValues,
                    setOfRecordNodesValues, internalStuff.receipts, internalStuff.battleJournalEntries,
                    internalStuff.clientPlatform, internalStuff.clientVersion,
                    callbackFn
                );
            }
        }
        function tryToReturnResourceLock(err){
            if(internalStuff.acquiredResourceLock){
                let callbackFn = () => {
                    if(err){
                        internalStuff.theSecretCallback(err, null);
                    } else {
                        internalStuff.theSecretCallback(errArg, internalStuff.objectToReturn, internalStuff.traces);
                    }
                };

                etcApi.returnResourcesLock(internalStuff.acquiredResourceLock, callbackFn);
            } else if(err){
                internalStuff.theSecretCallback(err, null);
            } else {
                internalStuff.theSecretCallback(errArg, internalStuff.objectToReturn, internalStuff.traces);
            }
        }

        if(!errArg){
            checkProfileNodes();
        } else {
            tryToReturnResourceLock();
        }
    }
    function trace(what){
        if(!enableTraces){
            throw new ErrorResponse(1080, 'CF traces are not enabled');
        } else {
            what = cfUtils.cleanObjectFromContext(what);
            internalStuff.traces.push(_.isNumber(what) ? what || 0 : what)
        }
    }

    var internalStuff = new InternalStuff(
        allowToAccessProfile, allowToAccessRecords, name, allowToDefineGlobal,
        allowToMatchmake, callback, clientPlatform, clientVersion, sessionObject, theLock || null, now
    );
    var argv = new TheArgv(pid, humanId);
    var allTheStuff = new AllTheStuff(
        getProfileNode, getSomeProfileNode, getPublicProfileNode, setProfileNode, setSomeProfileNode, getSelfRating,
        setSelfRating, getSomeonesRating, setSomeonesRating, getSelfRatings, checkForBattleDebts, allowToMatchmake,
        argv, internalStuff, defineGlobal, CreateNewProfileResponseF, MutateProfileResponseF, PveInitResponseF,
        PveActResponseF, PveFinalizeResponseF, FunctionResponseF, PvpResponseF, PvpMessageHandlerF, PvpConnectionHandlerF,
        PvpDisconnectionHandlerF, PvpAutoDefeatResponseF, OnMatchmakingResponseF, humanId, args, sessionData, clientParams,
        validateStoreReceipt, appendBattleJournalPve, appendSelfBattleJournalPve, appendBattleJournalPvp, selfLock,
        selfAndSomeLock, onlySomeLock, getLock, returnCurrentLock, checkIsBot, run, accessOnlyInternal, accessOnlyExternal,
        theGlobal, trace, new CfLoggerFacade(now, name)
    );

    return [allTheStuff, globalResolver];
}