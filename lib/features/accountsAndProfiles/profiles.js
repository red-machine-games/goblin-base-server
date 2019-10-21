'use strict';

const PROFILE_MODIFY_RESERVED_NODES_PRIMARY = [
        'humanId', 'unlinkedTtlIndex', 'vk', 'fb', 'ok', 'rating', 'battles', 'ratings'
    ],
    PROFILE_NODES_ALLOWED_TO_READ = ['humanId', 'vk', 'fb', 'ok'],
    PROFILE_MODIFY_RESERVED_NODES_SECONDARY = ['ver', 'mmr', 'wlRate'];

module.exports = {
    tryToRefreshUnlinkedProfiles,

    createProfile,
    createNewProfileProcedure,
    getProfile,
    setProfile,
    updateProfile,
    updateProfileJP,
    getPublicProfile,
    tryToMutateProfileImplementation,

    runCloudFunction,

    PROFILE_MODIFY_RESERVED_NODES_PRIMARY,
    PROFILE_MODIFY_RESERVED_NODES_SECONDARY
};

const goblinBase = require('../../../index.js').getGoblinBase(),
    log = goblinBase.logsHook;

const JP_SET = 'set',
    JP_DEL = 'del',
    JP_INCREMENT = 'inc',
    JP_DECREMENT = 'dec',
    JP_PUSH = 'pus',
    JP_PULL = 'pul';

var _ = require('lodash'),
    cloneDeep = require('clone-deep'),
    crc32 = require('crc-32'),
    ObjectID = require('mongodb').ObjectID;

const PROFILE_NODES_READ_FILTER = _.difference(PROFILE_MODIFY_RESERVED_NODES_PRIMARY, PROFILE_NODES_ALLOWED_TO_READ);

const DEFAULT_PROFILE_BODY = {
    wlRate: 0,
    ver: 1
};

var opClients = require('../../operativeSubsystem/opClients.js'),
    sessionKeeper = require('../../webMiddleware/sessionKeeper.js'),
    CF_EntryPoint = require('../cloudFunctions/CF_EntryPoint.js'),
    atomicActs = require('../atomic/atomicActs.js'),
    cfUtils = require('../cloudFunctions/utils/cfUtils.js'),
    opResourceLocker = require('../../generalUtils/opResourceLocker.js');

var Account = require('../../persistenceSubsystem/dao/account.js'),
    Profile = require('../../persistenceSubsystem/dao/profile.js'),
    ProfileCounter = require('../../persistenceSubsystem/dao/sequenceCounter.js');

var ErrorResponse = require('../../objects/ErrorResponse.js'),
    ErrorResponseWithCode = require('../../objects/ErrorResponseWithCode.js');

var unlinkedProfileTtlMs = goblinBase.profilesConfig.numericConstants.unlinkedProfileTtlMs,
    profilesRefreshBatchSize = goblinBase.profilesConfig.numericConstants.profilesRefreshBatchSize,
    profilesRefreshPackageTimeout = goblinBase.profilesConfig.numericConstants.profilesRefreshPackageTimeout,
    profilesRefreshAllTimeout = goblinBase.profilesConfig.numericConstants.profilesRefreshAllTimeout;

var refreshUnlinkedProfilesLazyTimeout = _.now();

function tryToRefreshUnlinkedProfiles(now, callback){
    var profilesCount, fromPage = 0, thePage, lockKey, hasLinked, hasUnlinked;

    function tryToLockRefresh(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 66, err: { code: err.code, command: err.command, message: err.message } });
                callback(new ErrorResponse(66, 'OP Error'));
            } else if(response[0] === 0){
                callback(null);
            } else {
                fromPage = response[1];
                lockKey = _.isUndefined(response[3]) ? 1 : response[3];
                if(response[2] && response[2] > 0){
                    profilesCount = response[2];
                    nextPage();
                } else {
                    getTheLatestHid();
                }
            }
        };

        opClients.getSessionsClient()
            .tryToLockProfilesRefresh([now, profilesRefreshPackageTimeout, profilesRefreshAllTimeout], callbackFn);
    }
    function getTheLatestHid(){
        let callbackFn = (err, doc) => {
            if(err){
                log.error('Mongodb Error', { code: 982, err: { message: err.message, name: err.name } });
                callback(new ErrorResponse(982, 'Database Error'), null);
            } else if(doc){
                profilesCount = doc.humanId;
                updateSeedingTo();
            } else {
                callback(null, false);
            }
        };

        Profile.findOne({}, { sort: { _id: 1 }, projection: { humanId: 1 } }, callbackFn);
    }
    function updateSeedingTo(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 68, err: { code: err.code, command: err.command, message: err.message } });
                callback(new ErrorResponse(68, 'OP Error'));
            } else if(response === 1){
                nextPage();
            } else {
                callback(null, false);
            }
        };

        opClients.getSessionsClient()
            .updateRefreshingProfiles([profilesCount, lockKey], callbackFn);
    }
    function nextPage(){
        let callbackFn = (err, docs) => {
            if(err){
                log.error('Mongodb Error', { code: 69, err: { message: err.message, name: err.name } });
                callback(new ErrorResponse(69, 'Database Error'));
            } else {
                thePage = docs.map(e => {
                    e.pid = e._id;
                    delete e._id;
                    return e;
                });
                if(!thePage.length){
                    fromPage += theLimit;
                    updateRefreshing();
                } else {
                    fromPage = parseInt(_.last(thePage).humanId) + 1;
                    getLinkage();
                }
            }
        };

        var theLimit = Math.min(profilesRefreshBatchSize, profilesCount - fromPage + 1),
            ttlTs = now - unlinkedProfileTtlMs;
        Profile.find(
            { humanId: { $gte: fromPage, $lt: fromPage + theLimit }, unlinkedTtlIndex: { $exists: true, $lte: ttlTs } },
            { projection: { _id: 1, humanId: 1 }, sort: { humanId: 1 } }
        ).toArray(callbackFn);
    }
    function getLinkage(){
        let callbackFn = (err, docsFound) => {
            if(err){
                log.error('Mongodb Error', { code: 70, err: { message: err.message, name: err.name } });
                callback(new ErrorResponse(70, 'Database Error'));
            } else {
                hasLinked = false;
                hasUnlinked = false;
                _.each(docsFound, doc => {
                    for(let i = 0 ; i < thePage.length ; i++){
                        let p = thePage[i];
                        if(doc.pid.equals(p.pid) || doc.npid.equals(p.pid)){
                            p.isLinked = true;
                            hasLinked = true;
                        } else {
                            hasUnlinked = true;
                        }
                    }
                });
                updateLinked();
            }
        };

        var targetPids = thePage.map(e => e.pid);
        Account.find(
            { $or: [{ pid: { $in: targetPids } }, { npid: { $in: targetPids } }] },
            { projection: { pid: 1, npid: 1 } }
        ).toArray(callbackFn);
    }
    function updateLinked(){
        if(hasLinked){
            let callbackFn = err => {
                if(err){
                    log.error('Mongodb Error', { code: 71, err: { message: err.message, name: err.name } });
                    callback(new ErrorResponse(71, 'Database Error'));
                } else {
                    removeWayBackUnlinked();
                }
            };

            Profile.findOneAndUpdate(
                { _id: { $in: thePage.filter(e => e.isLinked).map(e => e.pid) } },
                { $unset: { unlinkedTtlIndex: 1 } },
                callbackFn
            );
        } else {
            removeWayBackUnlinked();
        }
    }
    function removeWayBackUnlinked(){
        if(hasUnlinked){
            let callbackFn = err => {
                if(err){
                    log.error('Mongodb Error', { code: 72, err: { message: err.message, name: err.name } });
                    callback(new ErrorResponse(72, 'Database Error'));
                } else {
                    updateRefreshing();
                }
            };

            Profile.deleteMany({ _id: { $in: thePage.filter(e => !e.isLinked).map(e => e.pid) } }, callbackFn);
        } else {
            updateRefreshing();
        }
    }
    function updateRefreshing(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 73, err: { code: err.code, command: err.command, message: err.message } });
                callback(new ErrorResponse(73, 'OP Error'));
            } else {
                switch(thePage.length){
                    case 0:
                        log.info('Profiles refreshProfiles... REFRESHED 0');
                        break;
                    case 1:
                        log.info(`Profiles refreshProfiles... REFRESHED ONLY ${thePage[0].humanId}`);
                        break;
                    default:
                        log.info(`Profiles refreshProfiles... REFRESHED FROM ${_.first(thePage).humanId} ` +
                            `TO ${_.last(thePage).humanId}`);
                }
                callback(null);
            }
        };

        opClients.getSessionsClient().doneRefreshingProfiles([fromPage, lockKey, now], callbackFn);
    }

    if(now > refreshUnlinkedProfilesLazyTimeout){
        refreshUnlinkedProfilesLazyTimeout = now + profilesRefreshPackageTimeout;
        tryToLockRefresh();
    } else {
        callback(null);
    }
}

function createProfile(sessionObject, clientPlatform, clientVersion, callback){
    var now = _.now(),
        originalSession = cloneDeep(sessionObject),
        generatedHumanId, newProfileDoc,
        subsessionHash;

    function checkSession(){
        if(sessionObject.pcrd){
            justUnlockSession(400, new ErrorResponse(74, 'Already have profile'));
        } else if(!sessionObject.aid){
            justUnlockSession(500, new ErrorResponse(75, 'Malformed session'));
        } else {
            doCreateProfile();
        }
    }
    function doCreateProfile(){
        let callbackFn = (code, response, _newProfileDoc) => {
            if(code !== 200){
                subsessionHash = null;
                justUnlockSession(code, response);
            } else {
                generatedHumanId = response;
                newProfileDoc = _newProfileDoc;
                doIndexSession();
            }
        };

        if(goblinBase.cloudFunctionsConfig && goblinBase.cloudFunctionsConfig.customSession){
            subsessionHash = crc32.str(JSON.stringify(sessionObject.subs) || '');
        }
        createNewProfileProcedure(now, sessionObject, clientPlatform, clientVersion, callbackFn);
    }
    function doIndexSession(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 76, err: { code: err.code, command: err.command, message: err.message } });
                tryToDestroyAbandonedSession();
            } else {
                doUpdateAccount();
            }
        };

        opClients.getSessionsClient().indexSessionWithHid(
            [sessionObject.unicorn, generatedHumanId, goblinBase.accountsConfig.sessionLifetime],
            callbackFn
        );
    }
    function doUpdateAccount(){
        let callbackFn = err => {
            if(err){
                log.error('Mongodb Error', { code: 78, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(78, 'Database Error'));
            } else {
                removeTtlIndex();
            }
        };

        Account.findOneAndUpdate({ _id: new ObjectID(sessionObject.aid) }, { $set: { pid: newProfileDoc._id } }, callbackFn);
    }
    function removeTtlIndex(){
        let callbackFn = err => {
            if(err){
                log.error('Mongodb Error', { code: 79, err: { message: err.message, name: err.name } });
            }
            flushSession();
        };

        Profile.findOneAndUpdate({ humanId: generatedHumanId }, { $unset: { unlinkedTtlIndex: 1 } }, callbackFn);
    }
    function flushSession(){
        sessionObject.pid = newProfileDoc._id.toString();
        sessionObject.pcrd = true;
        sessionObject.hid = generatedHumanId;

        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 81, err: { code: err.code, command: err.command, message: err.message } });
                tryToDestroyAbandonedSession();
            } else if(goblinBase.authoritarianConfig && goblinBase.authoritarianConfig.disallowDirectProfileExposure){
                callback(200, {
                    disallowDirectProfileExposure: goblinBase.authoritarianConfig.disallowDirectProfileExposure
                });
            } else {
                delete newProfileDoc._id;
                delete newProfileDoc.unlinkedTtlIndex;
                callback(200, newProfileDoc);
            }
        };

        var sessionDelta = _.simpleFirstLevelDiff(originalSession, sessionObject);
        sessionKeeper.flushSession(sessionDelta, sessionObject, null, callbackFn);
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 82, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
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
    function tryToDestroyAbandonedSession(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 83, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(200, { humanId: generatedHumanId });
        };

        sessionKeeper.destroySession(sessionObject, callbackFn);
    }

    checkSession();
}
function createNewProfileProcedure(now, sessionObject, clientPlatform, clientVersion, callback){
    var customProfileObj, generatedHumanId, newProfileDoc;

    function generateHumanId(){
        let callbackFn = (err, _generatedHumanId) => {
            if(err){
                justUnlockSession(500, err);
            } else {
                generatedHumanId = _generatedHumanId;
                tryToGenerateCustomProfile();
            }
        };

        getNextSequenceValue(1, callbackFn);
    }
    function tryToGenerateCustomProfile(){
        if(goblinBase.cloudFunctionsConfig){
            let callbackFn = (err, response) => {
                if(err){
                    if(err instanceof ErrorResponseWithCode){
                        callback(err.code, err.getWithoutCode());
                    } else {
                        callback(500, err);
                    }
                } else {
                    if(response){
                        customProfileObj = cfUtils.cleanObjectFromContext(response.profileBody) || {};
                    } else {
                        customProfileObj = {};
                    }
                    doCreateProfile();
                }
            };

            CF_EntryPoint.createNewProfile(now, clientPlatform, clientVersion, sessionObject, callbackFn);
        } else {
            customProfileObj = {};
            doCreateProfile();
        }
    }
    function doCreateProfile(){
        let callbackFn = (err, result) => {
            if(err){
                log.error('Mongodb Error', { code: 77, err: { message: err.message, name: err.name } });
                callback(500, new ErrorResponse(77, 'Database Error'));
            } else {
                newProfileDoc = result;
                tryToCallOnGetProfile();
            }
        };

        var newProfileBody = {},
            profileBase = { humanId: generatedHumanId, unlinkedTtlIndex: Math.floor(now / 1000) };
        if(sessionObject.vkId){
            newProfileBody.vk = sessionObject.vkId;
        } else if(sessionObject.fbId){
            newProfileBody.fb = sessionObject.fbId;
        } if(sessionObject.okId){
            newProfileBody.ok = sessionObject.okId;
        }
        _.extend(newProfileBody, DEFAULT_PROFILE_BODY, customProfileObj, profileBase);
        if(goblinBase.matchmakingConfig && goblinBase.matchmakingConfig.strategy === 'predefined' && _.isUndefined(newProfileBody.mmr)){
            newProfileBody.mmr = 0;
        }
        Profile.createNew(newProfileBody, callbackFn);
    }
    function tryToCallOnGetProfile(){
        if(goblinBase.cloudFunctionsConfig){
            let callbackFn = err => {
                if(err){
                    callback(500, err);
                } else {
                    callback(200, generatedHumanId, newProfileDoc);
                }
            };

            CF_EntryPoint.onGetProfile(
                now, newProfileDoc._id.toString(), newProfileDoc.humanId, sessionObject.subs, clientPlatform, clientVersion,
                sessionObject, callbackFn
            );
        } else {
            callback(200, generatedHumanId, newProfileDoc);
        }
    }

    generateHumanId();
}
function getProfile(sessionObject, clientPlatform, clientVersion, callback){
    var now = _.now(),
        originalSession = cloneDeep(sessionObject),
        profileToReturn, theVk, theOk, theFb,
        subsessionHash;

    function checkSession(){
        if(sessionObject.aid && sessionObject.pcrd && sessionObject.pid){
            checkAtomicActions();
        } else {
            tryToDestroyAbandonedSession();
        }
    }
    function tryToDestroyAbandonedSession(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 84, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(400, new ErrorResponse(85, 'You do not have a profile or should get one'));
        };

        sessionKeeper.destroySession(sessionObject, callbackFn);
    }
    function checkAtomicActions(){
        let callbackFn = err => {
            if(err){
                return justUnlockSession(500, err);
            } else if(goblinBase.cloudFunctionsConfig){
                doGetProfileWithoutDetails();
            } else {
                doGetProfileFull();
            }
        };

        atomicActs.checkAtomicActs(undefined, sessionObject.pid, callbackFn);
    }
    function doGetProfileWithoutDetails(){
        let callbackFn = (err, docFound) => {
            if(err){
                log.error('Mongodb Error', { code: 38, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(38, 'Database Error'));
            } else {
                sessionObject.hid = docFound.humanId;
                theVk = docFound.vk;
                theOk = docFound.ok;
                theFb = docFound.fb;
                tryToMutateProfile();
            }
        };

        Profile.findOne(
            { _id: new ObjectID(sessionObject.pid) },
            { projection: { _id: 0, humanId: 1, vk: 1, fb: 1, ok: 1 } },
            callbackFn
        );
    }
    function tryToMutateProfile(){
        let callbackFn = (response, code) => {
            if(code !== 200){
                justUnlockSession(code, response);
            } else {
                tryToCallOnGetProfile();
            }
        };

        tryToMutateProfileImplementation(undefined, sessionObject, sessionObject.hid, clientPlatform, clientVersion, now, callbackFn);
    }
    function tryToCallOnGetProfile(){
        if(goblinBase.cloudFunctionsConfig){
            let callbackFn = err => {
                if(err){
                    subsessionHash = null;
                    justUnlockSession(500, err);
                } else {
                    tryToGetProfileFull();
                }
            };

            if(goblinBase.cloudFunctionsConfig && goblinBase.cloudFunctionsConfig.customSession){
                subsessionHash = crc32.str(JSON.stringify(sessionObject.subs) || '');
            }
            CF_EntryPoint.onGetProfile(now, null, null, sessionObject.subs, clientPlatform, clientVersion, sessionObject, callbackFn);
        } else {
            tryToGetProfileFull();
        }
    }
    function tryToGetProfileFull(){
        if(!goblinBase.authoritarianConfig || !goblinBase.authoritarianConfig.disallowDirectProfileExposure){
            doGetProfileFull();
        } else {
            doIndexSession();
        }
    }
    function doGetProfileFull(){
        let callbackFn = (err, docFound) => {
            if(err){
                log.error('Mongodb Error', { code: 86, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(86, 'Database Error'));
            } else {
                profileToReturn = docFound;
                if(sessionObject.hid){
                    profileToReturn.humanId = sessionObject.hid;
                } else {
                    profileToReturn.humanId = sessionObject.hid = docFound.humanId;
                }
                if(theVk){
                    profileToReturn.vk = theVk;
                } else if(profileToReturn.vk){
                    theVk = profileToReturn.vk;
                }
                if(theOk){
                    profileToReturn.ok = theOk;
                } else if(profileToReturn.ok){
                    theOk = profileToReturn.ok;
                }
                if(theFb){
                    profileToReturn.fb = theFb;
                } else if(profileToReturn.fb){
                    theFb = profileToReturn.fb;
                }
                _.each(PROFILE_NODES_READ_FILTER, n => delete profileToReturn[n]);
                doIndexSession();
            }
        };

        var projection = { unlinkedTtlIndex: 0, _id: 0 };
        if(sessionObject.hid){
            projection.humanId = 0;
        }
        if(theVk){
            projection.vk = 0;
        }
        if(theOk){
            projection.ok = 0;
        }
        if(theFb){
            projection.fb = 0;
        }
        Profile.findOne({ _id: new ObjectID(sessionObject.pid) }, { projection }, callbackFn);
    }
    function doIndexSession(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 87, err: { code: err.code, command: err.command, message: err.message } });
                tryToDestroyAbandonedSession();
            } else {
                flushSession();
            }
        };

        opClients.getSessionsClient().indexSessionWithHid(
            [sessionObject.unicorn, sessionObject.hid, goblinBase.accountsConfig.sessionLifetime],
            callbackFn
        );
    }
    function flushSession(){
        sessionObject.pcrd = true;
        if(theVk){
            sessionObject.vkId = theVk;
        }
        if(theFb){
            sessionObject.fbId = theFb;
        }
        if(theOk){
            sessionObject.okId = theOk;
        }

        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 88, err: { code: err.code, command: err.command, message: err.message } });
                tryToDestroyAbandonedSession();
            } else if(goblinBase.authoritarianConfig && goblinBase.authoritarianConfig.disallowDirectProfileExposure){
                callback(200, { disallowDirectProfileExposure: true });
            } else {
                callback(200, profileToReturn);
            }
        };

        var sessionDelta = _.simpleFirstLevelDiff(originalSession, sessionObject);
        sessionKeeper.flushSession(sessionDelta, sessionObject, null, callbackFn);
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 89, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
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
function setProfile(sessionObject, newProfileBodies, callback){
    var theLock;

    function checkSessionAndInput(){
        if(sessionObject.aid && sessionObject.pcrd && sessionObject.pid && sessionObject.hid){
            if(_.isPlainObject(newProfileBodies) && !_.isEmpty(newProfileBodies)
                    && (_.isPlainObject(newProfileBodies.profileData) || _.isPlainObject(newProfileBodies.publicProfileData)
                        || _.isNumber(newProfileBodies.rating)
                        || _.isNumber(newProfileBodies.mmr) || _.isNumber(newProfileBodies.ver))
                        || _.isNumber(newProfileBodies.wlRate)){
                extraValidation();
            } else {
                justUnlockSession(400, new ErrorResponse(90, 'Set profile is malformed'));
            }
        } else {
            tryToDestroyAbandonedSession();
        }
    }
    function tryToDestroyAbandonedSession(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 91, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(400, new ErrorResponse(92, 'Get or create profile first'));
        };

        sessionKeeper.destroySession(sessionObject, callbackFn);
    }
    function extraValidation(){
        if(_.checkSpecialMongodbSymbols(newProfileBodies) 
                || _.checkObjectHasSomeOfKeys(newProfileBodies, PROFILE_MODIFY_RESERVED_NODES_PRIMARY)){
            justUnlockSession(400, new ErrorResponse(93, 'New profile is malformed'));
        } else {
            acquireResourceLock();
        }
    }
    function acquireResourceLock(){
        let callbackFn = (err, _theLock) => {
            if(err){
                callback(500, err);
            } else {
                theLock = _theLock;
                doSetProfile();
            }
        };

        opResourceLocker.getLock(sessionObject.hid, callbackFn);
    }
    function doSetProfile(){
        let callbackFn = (err, result) => {
            if(err){
                log.error('Mongodb Error', { code: 94, err: { message: err.message, name: err.name } });
                returnResourcesLock(500, new ErrorResponse(94, 'Database Error'));
            } else if(result.lastErrorObject.n){
                returnResourcesLock(200);
            } else {
                returnResourcesLock(400, new ErrorResponse(1337, 'Surprisingly unsuccessful'));
            }
        };

        var q = {};
        if(_.isPlainObject(newProfileBodies.profileData)){
            q.profileData = newProfileBodies.profileData;
        }
        if(_.isPlainObject(newProfileBodies.publicProfileData)){
            q.publicProfileData = newProfileBodies.publicProfileData;
        }
        if(_.isNumber(newProfileBodies.rating)){
            q.rating = newProfileBodies.rating;
        }
        if(_.isNumber(newProfileBodies.mmr)){
            q.mmr = newProfileBodies.mmr;
        }
        if(_.isNumber(newProfileBodies.ver)){
            q.ver = newProfileBodies.ver;
        }
        if(_.isNumber(newProfileBodies.wlRate)){
            q.wlRate = newProfileBodies.wlRate;
        }
        Profile.findOneAndUpdate({ _id: new ObjectID(sessionObject.pid) }, { $set: q }, callbackFn);
    }
    function returnResourcesLock(code, response){
        opResourceLocker.returnLock(theLock, () => justUnlockSession(code, response));
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 95, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkSessionAndInput();
}
function updateProfile(sessionObject, profileBodies, callback){
    var theLock;

    function checkSessionAndInput(){
        if(sessionObject.aid && sessionObject.pcrd && sessionObject.pid && sessionObject.hid){
            if(_.isPlainObject(profileBodies) && !_.isEmpty(profileBodies)
                && (_.isPlainObject(profileBodies.profileData) || _.isPlainObject(profileBodies.publicProfileData)
                    || _.isNumber(profileBodies.rating)
                    || _.isNumber(profileBodies.mmr) || _.isNumber(profileBodies.ver))
                    || _.isNumber(profileBodies.wlRate)){
                emptyCheck();
            } else {
                justUnlockSession(400, new ErrorResponse(96, 'Profile update is malformed'));
            }
        } else {
            tryToDestroyAbandonedSession();
        }
    }
    function emptyCheck(){
        if(profileBodies.profileData && _.isEmpty(profileBodies.profileData)){
            justUnlockSession(400, new ErrorResponse(960, '"profileData" node is empty'));
        } else if(profileBodies.publicProfileData && _.isEmpty(profileBodies.publicProfileData)){
            justUnlockSession(400, new ErrorResponse(961, '"publicProfileData" node is empty'));
        } else {
            extraValidation();
        }
    }
    function tryToDestroyAbandonedSession(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 97, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(400, new ErrorResponse(98, 'Get or create profile first'));
        };

        sessionKeeper.destroySession(sessionObject, callbackFn);
    }
    function extraValidation(){
        if(_.checkSpecialMongodbSymbols(profileBodies) 
                || _.checkObjectHasSomeOfKeys(profileBodies, PROFILE_MODIFY_RESERVED_NODES_PRIMARY)){
            justUnlockSession(400, new ErrorResponse(99, 'Profile update is malformed'));
        } else {
            acquireResourceLock();
        }
    }
    function acquireResourceLock(){
        let callbackFn = (err, _theLock) => {
            if(err){
                callback(500, err);
            } else {
                theLock = _theLock;
                doUpdateProfile();
            }
        };

        opResourceLocker.getLock(sessionObject.hid, callbackFn);
    }
    function doUpdateProfile(){
        let callbackFn = (err, result) => {
            if(err){
                if(err.name === 'MongoError'){
                    returnResourcesLock(400, new ErrorResponse(100, 'Database Error'));
                } else {
                    log.error('Mongodb Error', { code: 100, err: { message: err.message, name: err.name } });
                    returnResourcesLock(500, new ErrorResponse(100, 'Database Error'));
                }
            } else if(result){
                returnResourcesLock(200);
            } else {
                returnResourcesLock(400, new ErrorResponse(1092, 'Surprisingly unsuccessful'));
            }
        };

        var setQ = {};
        if(_.isPlainObject(profileBodies.profileData)){
            _.each(_.withoutBadFields(profileBodies.profileData), (v, k) => {
                setQ[`profileData.${k}`] = v;
            });
        }
        if(_.isPlainObject(profileBodies.publicProfileData)){
            _.each(_.withoutBadFields(profileBodies.publicProfileData), (v, k) => {
                setQ[`publicProfileData.${k}`] = v;
            });
        }
        if(_.isNumber(profileBodies.rating)){
            setQ.rating = profileBodies.rating;
        }
        if(_.isNumber(profileBodies.mmr)){
            setQ.mmr = profileBodies.mmr;
        }
        if(_.isNumber(profileBodies.ver)){
            setQ.ver = profileBodies.ver;
        }
        if(_.isNumber(profileBodies.wlRate)){
            setQ.wlRate = profileBodies.wlRate;
        }
        Profile.findOneAndUpdate({ _id: new ObjectID(sessionObject.pid) }, { $set: setQ }, callbackFn);
    }
    function returnResourcesLock(code, response){
        opResourceLocker.returnLock(theLock, () => justUnlockSession(code, response));
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 101, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkSessionAndInput();
}
function updateProfileJP(sessionObject, jpBody, callback){
    var setQ, theLock;

    function checkSessionAndInput(){
        if(sessionObject.aid && sessionObject.pcrd && sessionObject.pid){
            if(Array.isArray(jpBody) && !_.isEmpty(jpBody)){
                transformJpToMongodbSet();
            } else {
                justUnlockSession(400, new ErrorResponse(102, 'JP update is malformed'));
            }
        } else {
            tryToDestroyAbandonedSession();
        }
    }
    function tryToDestroyAbandonedSession(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 103, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(500, new ErrorResponse(104, 'Session is abandoned, repeat login!'));
        };

        sessionKeeper.destroySession(sessionObject, callbackFn);
    }
    function transformJpToMongodbSet(){
        setQ = {};

        for(let i = 0 ; i < jpBody.length ; i++){
            let jp = jpBody[i];
            switch(true){
                case !!jp[JP_SET]:
                    if(!setQ.$set){
                        setQ.$set = {};
                    }
                    if(jp[JP_SET].startsWith('profileData.') || jp[JP_SET].startsWith('publicProfileData.')){
                        setQ.$set[jp[JP_SET]] = jp.val;
                    } else {
                        return justUnlockSession(400, new ErrorResponse(105, 'JP update is malformed'));
                    }
                    break;
                case !!jp[JP_DEL]:
                    if(!setQ.$unset){
                        setQ.$unset = {};
                    }
                    if(jp[JP_DEL].startsWith('profileData.') || jp[JP_DEL].startsWith('publicProfileData.')){
                        setQ.$unset[jp[JP_DEL]] = '';
                    } else {
                        return justUnlockSession(400, new ErrorResponse(106, 'JP update is malformed'));
                    }
                    break;
                case !!jp[JP_INCREMENT]:
                    if(!setQ.$inc){
                        setQ.$inc = {};
                    }
                    if(jp[JP_INCREMENT].startsWith('profileData.') || jp[JP_INCREMENT].startsWith('publicProfileData.')){
                        setQ.$inc[jp[JP_INCREMENT]] = jp.val;
                    } else {
                        return justUnlockSession(400, new ErrorResponse(107, 'JP update is malformed'));
                    }
                    break;
                case !!jp[JP_DECREMENT]:
                    if(!setQ.$inc){
                        setQ.$inc = {};
                    }
                    if(jp[JP_DECREMENT].startsWith('profileData.') || jp[JP_DECREMENT].startsWith('publicProfileData.')){
                        setQ.$inc[jp[JP_DECREMENT]] = jp.val * -1 || 0;
                    } else {
                        return justUnlockSession(400, new ErrorResponse(108, 'JP update is malformed'));
                    }
                    break;
                case !!jp[JP_PUSH]:
                    if(!setQ.$push){
                        setQ.$push = {};
                    }
                    if(jp[JP_PUSH].startsWith('profileData.') || jp[JP_PUSH].startsWith('publicProfileData.')){
                        setQ.$push[jp[JP_PUSH]] = jp.val;
                    } else {
                        return justUnlockSession(400, new ErrorResponse(109, 'JP update is malformed'));
                    }
                    break;
                case !!jp[JP_PULL]:
                    if(!setQ.$pull){
                        setQ.$pull = {};
                    }
                    if(jp[JP_PULL].startsWith('profileData.') || jp[JP_PULL].startsWith('publicProfileData.')){
                        setQ.$pull[jp[JP_PULL]] = jp.val;
                    } else {
                        return justUnlockSession(400, new ErrorResponse(110, 'JP update is malformed'));
                    }
                    break;
            }
        }

        if(_.isEmpty(setQ)){
            justUnlockSession(400, new ErrorResponse(111, 'JP update is malformed'));
        } else {
            extraValidation();
        }
    }
    function extraValidation(){
        var fieldIndex = {};
        for(let k in setQ){
            if(setQ.hasOwnProperty(k)){
                if(_.checkSpecialMongodbSymbols(setQ[k])){
                    return justUnlockSession(400, new ErrorResponse(112, 'JP update is malformed'));
                } else {
                    for(let subk in setQ[k]){
                        if(setQ[k].hasOwnProperty(subk)){
                            if(fieldIndex[subk]){
                                return justUnlockSession(400, new ErrorResponse(113, 'JP update is malformed'));
                            } else {
                                fieldIndex[subk] = true;
                            }
                        }
                    }
                }
            }
        }
        acquireResourceLock();
    }
    function acquireResourceLock(){
        let callbackFn = (err, _theLock) => {
            if(err){
                callback(500, err);
            } else {
                theLock = _theLock;
                doUpdateProfileJP();
            }
        };

        opResourceLocker.getLock(sessionObject.hid, callbackFn);
    }
    function doUpdateProfileJP(){
        let callbackFn = (err, result) => {
            if(err){
                log.error('Mongodb Error', { code: 114, err: { message: err.message, name: err.name } });
                returnResourcesLock(500, new ErrorResponse(114, 'Database Error'));
            } else if(result){
                returnResourcesLock(200);
            } else {
                returnResourcesLock(400, new ErrorResponse(1093, 'Surprisingly unsuccessful'));
            }
        };

        Profile.findOneAndUpdate({ _id: new ObjectID(sessionObject.pid) }, setQ, callbackFn);
    }
    function returnResourcesLock(code, response){
        opResourceLocker.returnLock(theLock, () => justUnlockSession(code, response));
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 115, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkSessionAndInput();
}
function getPublicProfile(sessionObject, targetHumanId, callback){
    function checkSession(){
        if(sessionObject.aid){
            if(sessionObject.pcrd && sessionObject.pid){
                doGetProfile();
            } else {
                justUnlockSession(400, new ErrorResponse(505, 'You do not have a profile or should get one'));
            }
        } else {
            justUnlockSession(500, new ErrorResponse(506, 'Malformed session'));
        }
    }
    function doGetProfile(){
        let callbackFn = (err, docFound) => {
            if(err){
                log.error('Mongodb Error', { code: 507, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(507, 'Database Error'));
            } else if(docFound){
                justUnlockSession(200, docFound);
            } else {
                justUnlockSession(404, new ErrorResponse(508, 'Didn\'t found anything'));
            }
        };

        Profile.findOne({ humanId: targetHumanId }, { projection: { _id: 0, publicProfileData: 1, ver: 1 } }, callbackFn)
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 509, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkSession();
}

function tryToMutateProfileImplementation(theLock, sessionObjectOrPid, humanId, clientPlatform, clientVersion, now, callback){
    var pid, hid, sessionObject;

    function setPidAndSessionObject(){
        if(_.isPlainObject(sessionObjectOrPid)){
            sessionObject = sessionObjectOrPid;
            pid = sessionObject.pid;
        } else if(sessionObjectOrPid){
            sessionObject = null;
            pid = sessionObjectOrPid;
        } else {
            sessionObject = null;
            pid = null;
        }
        hid = humanId || sessionObject.hid;
        tryToMutateProfile();
    }
    function tryToMutateProfile() {
        if(goblinBase.cloudFunctionsConfig){
            let callbackFn = (err, response) => {
                if(err){
                    if(err instanceof ErrorResponseWithCode){
                        callback(err.getWithoutCode(), err.code);
                    } else {
                        callback(err, 500);
                    }
                } else if(response){
                    if(response.silentError){
                        callback(new ErrorResponse(652, response.silentError), 400);
                    } else {
                        callback(null, 200);
                    }
                } else {
                    callback(null, 200);
                }
            };

            CF_EntryPoint
                .mutateProfile(theLock, now, clientPlatform, clientVersion, pid, hid, sessionObject, callbackFn);
        } else {
            callback(null, 200);
        }
    }

    setPidAndSessionObject();
}

function runCloudFunction(sessionObject, actName, params, clientPlatform, clientVersion, callback){
    var now = _.now(),
        subsessionHash, codeToReturn, objectToReturn;

    function checkAction(){
        let callbackFn = (err, answer) => {
            if(err){
                justUnlockSession(500, err);
            } else if(answer){
                checkSessionAndInput();
            } else {
                justUnlockSession(400, new ErrorResponse(656, 'No cloud function with that name'));
            }
        };

        CF_EntryPoint.checkCustomActPresence(actName, callbackFn);
    }
    function checkSessionAndInput(){
        if(sessionObject.aid && sessionObject.pcrd && sessionObject.pid && sessionObject.hid){
            markSessionToKillInCaseOfFail();
        } else {
            tryToDestroyAbandonedSession();
        }
    }
    function tryToDestroyAbandonedSession(){
        if(global.Tmf3eQ9m) {    // Error emitter for test case "atomicsAreGoodAtFailures-contract.js"
            return callback(500, new ErrorResponse(9999, 'Tmf3eQ9m'));
        }
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 657, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(400, new ErrorResponse(658, 'Get or create profile first'));
        };

        sessionKeeper.destroySession(sessionObject, callbackFn);
    }
    function markSessionToKillInCaseOfFail(){
        let callbackFn = err => {
            if(err){
                callback(500, err);
            } else {
                doRunCustomAct();
            }
        };

        sessionKeeper.markSessionToKill(sessionObject.unicorn, callbackFn);
    }
    function doRunCustomAct(){
        let callbackFn = (err, response) => {
            if(err){
                if(err instanceof ErrorResponseWithCode){
                    destroySessionAfterActFailure(err.getWithoutCode(), err.code);
                } else if(err.index){
                    destroySessionAfterActFailure(err, 500);
                } else {
                    destroySessionAfterActFailure(new ErrorResponse(684, 'Custom function runtime error', { message: err.message }), 500);
                }
            } else {
                codeToReturn = response ? response.userRequestIsInvalid ? 400 : 200 : 200;
                objectToReturn = response ? response.objectToReturn : null;
                if(goblinBase.cloudFunctionsConfig && goblinBase.cloudFunctionsConfig.customSession){
                    flushSession();
                } else {
                    justUnlockSession(codeToReturn, objectToReturn);
                }
            }
        };

        if(goblinBase.cloudFunctionsConfig && goblinBase.cloudFunctionsConfig.customSession){
            subsessionHash = crc32.str(JSON.stringify(sessionObject.subs) || '');
        }
        CF_EntryPoint.runCustomAct(
            sessionObject.pid, sessionObject.hid, now, actName, sessionObject.subs, params,
            clientPlatform, clientVersion, sessionObject, callbackFn
        );
    }
    function destroySessionAfterActFailure(errObj, errCode){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 680, err: { code: err.code, command: err.command, message: err.message } });
                callback(errCode, new ErrorResponse(680, 'OP Error'));
            } else {
                callback(errCode, errObj);
            }
        };

        sessionKeeper.destroySession(sessionObject, callbackFn);
    }
    function flushSession(){
        if(global.YQGSQ9zR) {    // Error emitter for test case "atomicsAreGoodAtFailures-contract.js"
            return tryToDestroyAbandonedSession();
        }
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 659, err: { code: err.code, command: err.command, message: err.message } });
                tryToDestroyAbandonedSession();
            } else {
                callback(codeToReturn, objectToReturn);
            }
        };

        var newSubsessionHash = crc32.str(JSON.stringify(sessionObject.subs) || '');
        sessionKeeper.flushSession(
            null, sessionObject, subsessionHash !== newSubsessionHash ? sessionObject.subs : null, callbackFn
        );
    }
    function justUnlockSession(code, response){
        if(global.YQGSQ9zR) {    // Error emitter for test case "atomicsAreGoodAtFailures-contract.js"
            return callback(code, response);
        }
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 607, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkAction();
}

function getNextSequenceValue(sequenceShift, callback){
    const SEQUENCE_NAME = 'humanId';

    ProfileCounter.getNextSequenceValue(SEQUENCE_NAME, sequenceShift, callback);
}