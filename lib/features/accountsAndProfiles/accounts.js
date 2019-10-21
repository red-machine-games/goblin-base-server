'use strict';

module.exports = {
    getAccount,
    hasVkProfile,
    hasOkProfile,
    hasFbProfile,
    linkVkProfile,
    linkOkProfile,
    linkFbProfile,
    unlinkSocialProfile
};

const goblinBase = require('../../../index.js').getGoblinBase(),
    log = goblinBase.logsHook;

var _ = require('lodash'),
    cloneDeep = require('clone-deep'),
    safeCompare = require('express-basic-auth').safeCompare,
    ObjectID = require('mongodb').ObjectID;

const DUPLICATE_KEY_ERROR_CODE = 'DuplicateKey';

var sessionKeeper = require('../../webMiddleware/sessionKeeper.js'),
    opClients = require('../../operativeSubsystem/opClients.js'),
    profiles = require('./profiles.js');

var ErrorResponse = require('../../objects/ErrorResponse');

var Account = require('../../persistenceSubsystem/dao/account.js'),
    Profile = require('../../persistenceSubsystem/dao/profile.js');

var useSubsession = `${+(goblinBase.cloudFunctionsConfig ? goblinBase.cloudFunctionsConfig.customSession : false)}`;

function getAccount(sessionObject, gClientId, gClientSecret, vkId, fbId, okId, callback){
    var q, accountFound, newAid,
        sessionObjectOriginal = sessionObject.isNewSessionObject ? {} : cloneDeep(sessionObject);

    function checkInputs(){
        if(vkId || sessionObject.vkId){
            q = { vk: vkId || sessionObject.vkId };
            getAccountWithSocialId();
        } else if(fbId || sessionObject.fbId){
            q = { fb: fbId || sessionObject.fbId };
            getAccountWithSocialId();
        } else if(okId || sessionObject.okId){
            q = { ok: okId || sessionObject.okId };
            getAccountWithSocialId();
        } else if(gClientId && gClientSecret){
            if(sessionObject.newMobileAnonClient){
                q = { gClientId, gClientSecret };
                createNewAccount();
            } else {
                q = { gClientId };
                getNativeAccount();
            }
        } else if(sessionObject.aid){
            getAccountFromSessionObject();
        } else {
            justUnlockSession(400, new ErrorResponse(340, 'Invalid input'));
        }
    }
    function getAccountFromSessionObject(){
        let callbackFn = (err, docFound) => {
            if(err){
                log.error('Mongodb Error', { code: 19, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(19, 'Database Error'));
            } else if(docFound){
                accountFound = docFound;
                newAid = accountFound._id.toString();
                if(accountFound.pid){
                    delete accountFound.pid;
                    accountFound.prof = true;
                }
                delete accountFound._id;
                doIndexSession();
            } else {
                justUnlockSession(500, new ErrorResponse(20, 'Malformed session!'));
            }
        };

        Account.findOne({ _id: new ObjectID(sessionObject.aid) }, { projection: { pushToken: 0, lang: 0, npid: 0 } }, callbackFn);
    }
    function getNativeAccount(){
        let callbackFn = (err, docFound) => {
            if(err){
                log.error('Mongodb Error', { code: 21, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(21, 'Database Error'));
            } else if(docFound){
                accountFound = docFound;
                newAid = accountFound._id.toString();
                if(safeCompare(accountFound.gClientSecret, gClientSecret)){
                    if(accountFound.pid){
                        sessionObject.pcrd = true;
                        sessionObject.pid = accountFound.pid.toString();
                        accountFound.prof = true;
                        delete accountFound.pid;
                    }
                    sessionObject.aid = accountFound._id.toString();
                    delete accountFound._id;
                    doIndexSession();
                } else {
                    justUnlockSession(400, new ErrorResponse(22, 'Invalid gClientId and/or gClientSecret'));
                }
            } else {
                justUnlockSession(400, new ErrorResponse(23, 'Invalid gClientId and/or gClientSecret'));
            }
        };

        Account.findOne(q, { projection: { pushToken: 0, lang: 0, npid: 0 } }, callbackFn);
    }
    function getAccountWithSocialId(){
        let callbackFn = (err, result) => {
            if(err){
                log.error('Mongodb Error', { code: 24, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(24, 'Database Error'));
            } else {
                if(result.lastErrorObject.updatedExisting){
                    accountFound = result.value;
                } else {
                    accountFound = q;
                    accountFound._id = result.lastErrorObject.upserted;
                }
                newAid = accountFound._id.toString();
                if(accountFound.pid){
                    sessionObject.pcrd = true;
                    sessionObject.pid = accountFound.pid.toString();
                    accountFound.prof = true;
                    delete accountFound.pid;
                }
                delete accountFound._id;
                delete accountFound.pushToken;
                delete accountFound.lang;
                delete accountFound.npid;
                doIndexSession();
            }
        };

        Account.findOneAndUpdate(q, { $setOnInsert: q }, { new: true, upsert: true }, callbackFn);
    }
    function createNewAccount(){
        let callbackFn = (err, newDoc) => {
            if(err){
                if(err.message.startsWith('E11000 duplicate key error collection')){
                    justUnlockSession(400, new ErrorResponse(956, 'This login is taken'));
                } else {
                    log.error('Mongodb Error', { code: 25, err: { message: err.message, name: err.name } });
                    justUnlockSession(500, new ErrorResponse(25, 'Database Error'));
                }
            } else {
                accountFound = newDoc;
                newAid = accountFound._id.toString();
                delete accountFound._id;
                doIndexSession();
            }
        };

        if(gClientId && gClientSecret){
            q.gClientSecret = gClientSecret;
        }
        Account.createNew(q, callbackFn);
    }
    function doIndexSession(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 26, err: { code: err.code, command: err.command, message: err.message } });
                tryToDestroyAbandonedSession();
            } else {
                flushSession();
            }
        };

        opClients.getSessionsClient().indexSessionWithAid(
            [sessionObject.unicorn, newAid, goblinBase.accountsConfig.sessionLifetime],
            callbackFn
        );
    }
    function flushSession(){
        if(vkId && !sessionObject.vkId){
            sessionObject.vkId = vkId;
        }
        if(fbId && !sessionObject.fbId){
            sessionObject.fbId = fbId;
        }
        if(okId && !sessionObject.okId){
            sessionObject.okId = okId;
        }
        if(!sessionObject.aid){
            sessionObject.aid = newAid;
        }
        delete sessionObject.newMobileAnonClient;

        var isNewSessionObject = sessionObject.isNewSessionObject;
        delete sessionObject.isNewSessionObject;

        let callbackFn = err => {
            if(gClientId && gClientSecret && isNewSessionObject){
                if(err){
                    log.error('OP Error', { code: 27, err: { code: err.code, command: err.command, message: err.message } });
                    tryToDestroyAbandonedSession();
                } else {
                    accountFound.unicorn = sessionObject.unicorn;
                    accountFound.stz = new Date().getTimezoneOffset() * 60 * 1000;
                    if(goblinBase.authoritarianConfig){
                        accountFound.authoritarian = {
                            profiles: !!goblinBase.authoritarianConfig.disallowDirectProfileExposure,
                            matchmaking: !!goblinBase.authoritarianConfig.disallowDirectPvpMatchmakingExposure,
                            chatAndGroups: !!goblinBase.authoritarianConfig.disallowDirectChatAndGroupsExposure
                        }
                    }
                    callback(200, accountFound);
                }
            } else if(err){
                log.error('OP Error', { code: 28, err: { code: err.code, command: err.command, message: err.message } });
                callback(500, new ErrorResponse(28, 'OP Error', null));
            } else {
                accountFound.unicorn = sessionObject.unicorn;
                callback(200, accountFound);
            }
        };

        var sessionDelta = _.simpleFirstLevelDiff(sessionObjectOriginal, sessionObject);
        sessionKeeper.flushSession(sessionDelta, sessionObject, null, callbackFn);
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 29, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }
    function tryToDestroyAbandonedSession(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 30, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(200, accountFound);
        };

        sessionKeeper.destroySession(sessionObject, callbackFn);
    }

    checkInputs();
}
function hasVkProfile(sessionObject, vkToken, clientPlatform, clientVersion, callback){
    var vkId;

    function checkInputs(){
        if(!vkToken){
            justUnlockSession(400, new ErrorResponse(1011, 'Malformed vk token'));
        } else {
            checkSession();
        }
    }
    function checkSession(){
        if(!sessionObject.aid){
            tryToDestroyAbandonedSession();
        } else if(goblinBase.vkCredentials && goblinBase.vkCredentials.useTokenAsId){
            vkId = vkToken;
            checkProfilePresence();
        } else {
            checkVkToken();
        }
    }
    function checkVkToken(){
        let callbackFn = (code, response) => {
            if(code !== 200){
                justUnlockSession(code, response);
            } else {
                vkId = response;
                checkProfilePresence();
            }
        };

        sessionKeeper.checkVkUserToken(vkToken, callbackFn);
    }
    function checkProfilePresence(){
        let callbackFn = (err, doc) => {
            if(err){
                log.error('Mongodb Error', { code: 1012, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(1012, 'Database Error'));
            } else {
                justUnlockSession(200, { has: +!!doc });
            }
        };

        Profile.findOne({ vk: vkId }, { projection: { _id: 1 } }, callbackFn);
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 1013, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }
    function tryToDestroyAbandonedSession(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 1014, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(500, new ErrorResponse(1015, 'No account or malformed session. Try to get new one'));
        };

        sessionKeeper.destroySession(sessionObject, callbackFn);
    }

    checkInputs();
}
function hasOkProfile(sessionObject, okToken, clientPlatform, clientVersion, callback){
    var okId;

    function checkInputs(){
        if(!okToken || okToken.length >= 128){
            justUnlockSession(400, new ErrorResponse(1016, 'Malformed ok token'));
        } else {
            checkSession();
        }
    }
    function checkSession(){
        if(!sessionObject.aid){
            tryToDestroyAbandonedSession();
        } else if(goblinBase.okCredentials && goblinBase.okCredentials.useTokenAsId){
            okId = okToken;
            checkProfilePresence();
        } else {
            checkOkToken();
        }
    }
    function checkOkToken(){
        let callbackFn = (code, response) => {
            if(code !== 200){
                justUnlockSession(code, response);
            } else {
                okId = response;
                checkProfilePresence();
            }
        };

        sessionKeeper.checkOkUserToken(okToken, callbackFn);
    }
    function checkProfilePresence(){
        let callbackFn = (err, doc) => {
            if(err){
                log.error('Mongodb Error', { code: 1017, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(1017, 'Database Error'));
            } else {
                justUnlockSession(200, { has: +!!doc });
            }
        };

        Profile.findOne({ ok: okId }, { projection: { _id: 1 } }, callbackFn);
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 1018, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }
    function tryToDestroyAbandonedSession(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 1019, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(500, new ErrorResponse(1020, 'No account or malformed session. Try to get new one'));
        };

        sessionKeeper.destroySession(sessionObject, callbackFn);
    }

    checkInputs();
}
function hasFbProfile(sessionObject, fbToken, clientPlatform, clientVersion, callback){
    var fbId;

    function checkInputs(){
        if(!fbToken){
            justUnlockSession(400, new ErrorResponse(1021, 'Malformed fb token'));
        } else if(!sessionObject.aid){
            tryToDestroyAbandonedSession();
        } else if(goblinBase.facebookCredentials && goblinBase.facebookCredentials.useTokenAsId){
            fbId = fbToken;
            checkProfilePresence();
        } else {
            checkFbToken();
        }
    }
    function checkFbToken(){
        let callbackFn = (code, response) => {
            if(code !== 200){
                justUnlockSession(code, response);
            } else {
                fbId = response;
                checkProfilePresence();
            }
        };

        sessionKeeper.checkFbUserToken(fbToken, callbackFn);
    }
    function checkProfilePresence(){
        let callbackFn = (err, doc) => {
            if(err){
                log.error('Mongodb Error', { code: 1022, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(1022, 'Database Error'));
            } else {
                justUnlockSession(200, { has: +!!doc });
            }
        };

        Profile.findOne({ fb: fbId }, { projection: { _id: 1 } }, callbackFn);
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 1023, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }
    function tryToDestroyAbandonedSession(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 1024, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(500, new ErrorResponse(1025, 'No account or malformed session. Try to get new one'));
        };

        sessionKeeper.destroySession(sessionObject, callbackFn);
    }

    checkInputs();
}
function linkVkProfile(sessionObject, vkToken, noProfile, clientPlatform, clientVersion, callback){
    var now = _.now(),
        vkId, targetAccountDoc, targetProfileDoc, needNewProfile, generatedHumanId;

    function checkInputs(){
        if(!vkToken){
            justUnlockSession(400, new ErrorResponse(31, 'Malformed vk token'));
        } else {
            checkSession();
        }
    }
    function checkSession(){
        if(!sessionObject.aid){
            tryToDestroyAbandonedSession();
        } else if(goblinBase.vkCredentials && goblinBase.vkCredentials.useTokenAsId){
            vkId = vkToken;
            getAndCheckAccount();
        } else {
            checkVkToken();
        }
    }
    function checkVkToken(){
        let callbackFn = (code, response) => {
            if(code !== 200){
                justUnlockSession(code, response);
            } else {
                vkId = response;
                getAndCheckAccount();
            }
        };

        sessionKeeper.checkVkUserToken(vkToken, callbackFn);
    }
    function getAndCheckAccount(){
        let callbackFn = (err, doc) => {
            if(err){
                log.error('Mongodb Error', { code: 32, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(32, 'Database Error'));
            } else if(!doc){
                tryToDestroyAbandonedSession();
            } else {
                targetAccountDoc = doc;
                if(targetAccountDoc.vk || targetAccountDoc.fb || targetAccountDoc.ok){
                    justUnlockSession(400, new ErrorResponse(33, 'It is not a native account and cannot be linked'));
                } else if(targetAccountDoc.pid && targetAccountDoc.npid){
                    justUnlockSession(400, new ErrorResponse(34, 'This account is already linked'));
                } else if(!targetAccountDoc.pid && !targetAccountDoc.npid){
                    justUnlockSession(400, new ErrorResponse(35, 'You don\'t have a main profile to link one more'));
                } else if(noProfile){
                    checkProfilePresence();
                } else {
                    getAndCheckProfile();
                }
            }
        };

        Account.findOne(
            { _id: new ObjectID(sessionObject.aid) },
            { projection: { vk: 1, ok: 1, fb: 1, pid: 1, npid: 1 } },
            callbackFn
        );
    }
    function checkProfilePresence(){
        let callbackFn = (err, docFound) => {
            if(err){
                log.error('Mongodb Error', { code: 1026, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(1026, 'Database Error'));
            } else if(docFound){
                justUnlockSession(400, new ErrorResponse(1027, 'Already has profile for given social id. Transform current is not possible'));
            } else {
                destroySessionBeforeLink();
            }
        };

        Profile.findOne({ vk: vkId }, { projection: { _id: 1 } }, callbackFn);
    }
    function getAndCheckProfile(){
        let callbackFn = (err, result) => {
            if(err){
                log.error('Mongodb Error', { code: 36, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(36, 'Database Error'));
            } else {
                if(result.lastErrorObject.n){
                    targetProfileDoc = result.value;
                    needNewProfile = false;
                } else {
                    needNewProfile = true;
                }
                destroySessionBeforeLink();
            }
        };

        Profile.findOneAndUpdate(
            { vk: vkId },
            { $set: { unlinkedTtlIndex: Math.floor(_.now() / 1000) } },
            { projection: { humanId: 1, _id: 1 } },
            callbackFn
        );
    }
    function destroySessionBeforeLink(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 37, err: { code: err.code, command: err.command, message: err.message } });
                justUnlockSession(500, new ErrorResponse(37, 'OP Error'));
            } else if(noProfile){
                makeAccountToBiLogin();
            } else if(needNewProfile){
                doCreateProfile();
            } else {
                doLink();
            }
        };

        if(targetProfileDoc){
            opClients.getSessionsClient()
                .destroyTwoSessionsByUnicornAndHumanId([sessionObject.unicorn, targetProfileDoc.humanId, useSubsession], callbackFn);
        } else {
            sessionKeeper.destroySession(sessionObject, callbackFn);
        }
    }
    function doCreateProfile(){
        let callbackFn = (code, response, _newProfileDoc) => {
            if(code !== 200){
                callback(code, response);
            } else {
                generatedHumanId = response;
                targetProfileDoc = _newProfileDoc;
                doLink();
            }
        };

        sessionObject.vkId = vkId;
        profiles.createNewProfileProcedure(now, sessionObject, clientPlatform, clientVersion, callbackFn);
    }
    function doLink(){
        let callbackFn = err => {
            if(err){
                log.error('Mongodb Error', { code: 39, err: { message: err.message, name: err.name } });
                callback(500, new ErrorResponse(39, 'Database Error'));
            } else {
                removeTtlIndex();
            }
        };

        Account.findOneAndUpdate(
            { _id: new ObjectID(sessionObject.aid) },
            { $set: { npid: targetAccountDoc.pid, pid: targetProfileDoc._id } },
            callbackFn
        );
    }
    function removeTtlIndex(){
        let callbackFn = err => {
            if(err){
                log.error('Mongodb Error', { code: 40, err: { message: err.message, name: err.name } });
            }
            callback(200, { success: true, newProfile: needNewProfile });
        };

        Profile.findOneAndUpdate({ humanId: generatedHumanId }, { $unset: { unlinkedTtlIndex: 1 } }, callbackFn);
    }
    function makeAccountToBiLogin(){
        let callbackFn = err => {
            if(err){
                if(err.codeName === DUPLICATE_KEY_ERROR_CODE){
                    callback(400, new ErrorResponse(1028, 'Already have account with this social ID. No other allowed'));
                } else {
                    log.error('Mongodb Error', { code: 1029, err: { message: err.message, name: err.name } });
                    callback(500, new ErrorResponse(1029, 'Database Error'));
                }
            } else {
                justLinkCurrentProfile();
            }
        };

        Account.findOneAndUpdate({ _id: new ObjectID(sessionObject.aid) }, { $set: { vk: vkId } }, callbackFn);
    }
    function justLinkCurrentProfile(){
        let callbackFn = err => {
            if(err){
                log.error('Mongodb Error', { code: 1030, err: { message: err.message, name: err.name } });
                callback(500, new ErrorResponse(1030, 'Database Error'));
            } else {
                callback(200, { success: true, newProfile: false });
            }
        };

        Profile.findOneAndUpdate({ _id: new ObjectID(targetAccountDoc.pid) }, { $set: { vk: vkId } }, callbackFn);
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 41, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }
    function tryToDestroyAbandonedSession(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 42, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(500, new ErrorResponse(43, 'No account or malformed session. Try to get new one'));
        };

        sessionKeeper.destroySession(sessionObject, callbackFn);
    }

    checkInputs();
}
function linkOkProfile(sessionObject, okToken, noProfile, clientPlatform, clientVersion, callback){
    var now = _.now(),
        okId, targetAccountDoc, targetProfileDoc, needNewProfile, generatedHumanId;

    function checkInputs(){
        if(!okToken && okToken.length >= 128){
            justUnlockSession(400, new ErrorResponse(529, 'Malformed ok token'));
        } else {
            checkSession();
        }
    }
    function checkSession(){
        if(!sessionObject.aid){
            tryToDestroyAbandonedSession();
        } else if(goblinBase.okCredentials && goblinBase.okCredentials.useTokenAsId){
            okId = okToken;
            getAndCheckAccount();
        } else {
            checkOkToken();
        }
    }
    function checkOkToken(){
        let callbackFn = (code, response) => {
            if(code !== 200){
                justUnlockSession(code, response);
            } else {
                okId = response;
                getAndCheckAccount();
            }
        };

        sessionKeeper.checkOkUserToken(okToken, callbackFn);
    }
    function getAndCheckAccount(){
        let callbackFn = (err, doc) => {
            if(err){
                log.error('Mongodb Error', { code: 530, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(530, 'Database Error'));
            } else if(!doc){
                tryToDestroyAbandonedSession();
            } else {
                targetAccountDoc = doc;
                if(targetAccountDoc.vk || targetAccountDoc.fb || targetAccountDoc.ok){
                    justUnlockSession(400, new ErrorResponse(531, 'It is not a native account and cannot be linked'));
                } else if(targetAccountDoc.pid && targetAccountDoc.npid){
                    justUnlockSession(400, new ErrorResponse(532, 'This account is already linked'));
                } else if(!targetAccountDoc.pid && !targetAccountDoc.npid){
                    justUnlockSession(400, new ErrorResponse(533, 'You don\'t have a main profile to link one more'));
                } else if(noProfile){
                    checkProfilePresence();
                } else {
                    getAndCheckProfile();
                }
            }
        };

        Account.findOne(
            { _id: new ObjectID(sessionObject.aid) },
            { projection: { vk: 1, ok: 1, fb: 1, pid: 1, npid: 1 } },
            callbackFn
        );
    }
    function checkProfilePresence(){
        let callbackFn = (err, docFound) => {
            if(err){
                log.error('Mongodb Error', { code: 1031, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(1031, 'Database Error'));
            } else if(docFound){
                justUnlockSession(400, new ErrorResponse(1032, 'Already has profile for given social id. Transform current is not possible'));
            } else {
                destroySessionBeforeLink();
            }
        };

        Profile.findOne({ ok: okId }, { projection: { _id: 1 } }, callbackFn);
    }
    function getAndCheckProfile(){
        let callbackFn = (err, result) => {
            if(err){
                log.error('Mongodb Error', { code: 534, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(534, 'Database Error'));
            } else {
                if(result.lastErrorObject.n){
                    targetProfileDoc = result.value;
                    needNewProfile = false;
                } else {
                    needNewProfile = true;
                }
                destroySessionBeforeLink();
            }
        };

        Profile.findOneAndUpdate(
            { ok: okId },
            { $set: { unlinkedTtlIndex: Math.floor(_.now() / 1000) } },
            { projection: { humanId: 1, _id: 1 } },
            callbackFn
        );
    }
    function destroySessionBeforeLink(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 535, err: { code: err.code, command: err.command, message: err.message } });
                justUnlockSession(500, new ErrorResponse(535, 'OP Error'));
            } else if(noProfile){
                makeAccountToBiLogin();
            } else if(needNewProfile){
                doCreateProfile();
            } else {
                doLink();
            }
        };

        if(targetProfileDoc){
            opClients.getSessionsClient()
                .destroyTwoSessionsByUnicornAndHumanId([sessionObject.unicorn, targetProfileDoc.humanId, useSubsession], callbackFn);
        } else {
            sessionKeeper.destroySession(sessionObject, callbackFn);
        }
    }
    function doCreateProfile(){
        let callbackFn = (code, response, _newProfileDoc) => {
            if(code !== 200){
                callback(code, response);
            } else {
                generatedHumanId = response;
                targetProfileDoc = _newProfileDoc;
                doLink();
            }
        };

        sessionObject.okId = okId;
        profiles.createNewProfileProcedure(now, sessionObject, clientPlatform, clientVersion, callbackFn);
    }
    function doLink(){
        let callbackFn = err => {
            if(err){
                log.error('Mongodb Error', { code: 537, err: { message: err.message, name: err.name } });
                callback(500, new ErrorResponse(537, 'Database Error'));
            } else {
                removeTtlIndex();
            }
        };

        Account.findOneAndUpdate(
            { _id: new ObjectID(sessionObject.aid) },
            { $set: { npid: targetAccountDoc.pid, pid: targetProfileDoc._id } },
            callbackFn
        );
    }
    function removeTtlIndex(){
        let callbackFn = err => {
            if(err){
                log.error('Mongodb Error', { code: 538, err: { message: err.message, name: err.name } });
            }
            callback(200, { success: true, newProfile: needNewProfile });
        };

        Profile.findOneAndUpdate({ humanId: generatedHumanId }, { $unset: { unlinkedTtlIndex: 1 } }, callbackFn);
    }
    function makeAccountToBiLogin(){
        let callbackFn = err => {
            if(err){
                if(err.codeName === DUPLICATE_KEY_ERROR_CODE){
                    callback(400, new ErrorResponse(1033, 'Already have account with this social ID. No other allowed'));
                } else {
                    log.error('Mongodb Error', { code: 1034, err: { message: err.message, name: err.name } });
                    callback(500, new ErrorResponse(1034, 'Database Error'));
                }
            } else {
                justLinkCurrentProfile();
            }
        };

        Account.findOneAndUpdate({ _id: new ObjectID(sessionObject.aid) }, { $set: { ok: okId } }, callbackFn);
    }
    function justLinkCurrentProfile(){
        let callbackFn = err => {
            if(err){
                log.error('Mongodb Error', { code: 1035, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(1035, 'Database Error'));
            } else {
                justUnlockSession(200, { success: true, newProfile: false });
            }
        };

        Profile.findOneAndUpdate({ _id: new ObjectID(targetAccountDoc.pid) }, { $set: { ok: okId } }, callbackFn);
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 539, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }
    function tryToDestroyAbandonedSession(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 540, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(500, new ErrorResponse(43, 'No account or malformed session. Try to get new one'));
        };

        sessionKeeper.destroySession(sessionObject, callbackFn);
    }

    checkInputs();
}
function linkFbProfile(sessionObject, fbToken, noProfile, clientPlatform, clientVersion, callback){
    var now = _.now(),
        fbId, targetAccountDoc, targetProfileDoc, needNewProfile, generatedHumanId;

    function checkInputs(){
        if(!fbToken){
            justUnlockSession(400, new ErrorResponse(44, 'Malformed fb token'));
        } else if(!sessionObject.aid){
            tryToDestroyAbandonedSession();
        } else if(goblinBase.facebookCredentials && goblinBase.facebookCredentials.useTokenAsId){
            fbId = fbToken;
            getAndCheckAccount();
        } else {
            checkFbToken();
        }
    }
    function checkFbToken(){
        let callbackFn = (code, response) => {
            if(code !== 200){
                justUnlockSession(code, response);
            } else {
                fbId = response;
                getAndCheckAccount();
            }
        };

        sessionKeeper.checkFbUserToken(fbToken, callbackFn);
    }
    function getAndCheckAccount(){
        let callbackFn = (err, doc) => {
            if(err){
                log.error('Mongodb Error', { code: 45, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(45, 'Database Error'));
            } else if(!doc){
                tryToDestroyAbandonedSession();
            } else {
                targetAccountDoc = doc;
                if(targetAccountDoc.vk || targetAccountDoc.fb || targetAccountDoc.ok){
                    justUnlockSession(400, new ErrorResponse(46, 'It is not a native account and cannot be linked'));
                } else if(targetAccountDoc.pid && targetAccountDoc.npid){
                    justUnlockSession(400, new ErrorResponse(47, 'This account is already linked'));
                } else if(!targetAccountDoc.pid && !targetAccountDoc.npid){
                    justUnlockSession(400, new ErrorResponse(48, 'You don\'t have a main profile to link one more'));
                } else if(noProfile){
                    checkProfilePresence();
                } else {
                    getAndCheckProfile();
                }
            }
        };

        Account.findOne(
            { _id: new ObjectID(sessionObject.aid) },
            { projection: { vk: 1, ok: 1, fb: 1, pid: 1, npid: 1 } },
            callbackFn
        );
    }
    function checkProfilePresence(){
        let callbackFn = (err, docFound) => {
            if(err){
                log.error('Mongodb Error', { code: 1036, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(1036, 'Database Error'));
            } else if(docFound){
                justUnlockSession(400, new ErrorResponse(1037, 'Already has profile for given social id. Transform current is not possible'));
            } else {
                destroySessionBeforeLink();
            }
        };

        Profile.findOne({ fb: fbId }, { projection: { _id: 1 } }, callbackFn);
    }
    function getAndCheckProfile(){
        let callbackFn = (err, result) => {
            if(err){
                log.error('Mongodb Error', { code: 49, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(49, 'Database Error'));
            } else {
                if(result.lastErrorObject.n){
                    targetProfileDoc = result.value;
                    needNewProfile = false;
                } else {
                    needNewProfile = true;
                }
                destroySessionBeforeLink();
            }
        };

        Profile.findOneAndUpdate(
            { fb: fbId },
            { $set: { unlinkedTtlIndex: Math.floor(_.now() / 1000) }  },
            { projection: { humanId: 1, _id: 1 } },
            callbackFn
        );
    }
    function destroySessionBeforeLink(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 50, err: { code: err.code, command: err.command, message: err.message } });
                justUnlockSession(500, new ErrorResponse(50, 'OP Error'));
            } else if(noProfile){
                makeAccountToBiLogin();
            } else if(needNewProfile){
                doCreateProfile();
            } else {
                doLink();
            }
        };

        if(targetProfileDoc){
            opClients.getSessionsClient()
                .destroyTwoSessionsByUnicornAndHumanId([sessionObject.unicorn, targetProfileDoc.humanId, useSubsession], callbackFn);
        } else {
            sessionKeeper.destroySession(sessionObject, callbackFn);
        }
    }
    function doCreateProfile(){
        let callbackFn = (code, response, _newProfileDoc) => {
            if(code !== 200){
                callback(code, response);
            } else {
                generatedHumanId = response;
                targetProfileDoc = _newProfileDoc;
                doLink();
            }
        };

        sessionObject.fbId = fbId;
        profiles.createNewProfileProcedure(now, sessionObject, clientPlatform, clientVersion, callbackFn);
    }
    function doLink(){
        let callbackFn = err => {
            if(err){
                log.error('Mongodb Error', { code: 52, err: { message: err.message, name: err.name } });
                callback(500, new ErrorResponse(52, 'Database Error'));
            } else {
                removeTtlIndex();
            }
        };

        Account.findOneAndUpdate(
            { _id: new ObjectID(sessionObject.aid) },
            { $set: { npid: targetAccountDoc.pid, pid: targetProfileDoc._id } },
            callbackFn
        );
    }
    function removeTtlIndex(){
        let callbackFn = err => {
            if(err){
                log.error('Mongodb Error', { code: 53, err: { message: err.message, name: err.name } });
            }
            callback(200, { success: true, newProfile: needNewProfile });
        };

        Profile.findOneAndUpdate({ humanId: generatedHumanId }, { $unset: { unlinkedTtlIndex: 1 } }, callbackFn);
    }
    function makeAccountToBiLogin(){
        let callbackFn = err => {
            if(err){
                if(err.codeName === DUPLICATE_KEY_ERROR_CODE){
                    callback(400, new ErrorResponse(1038, 'Already have account with this social ID. No other allowed'));
                } else {
                    log.error('Mongodb Error', { code: 1039, err: { message: err.message, name: err.name } });
                    callback(500, new ErrorResponse(1039, 'Database Error'));
                }
            } else {
                justLinkCurrentProfile();
            }
        };

        Account.findOneAndUpdate({ _id: new ObjectID(sessionObject.aid) }, { $set: { fb: fbId } }, callbackFn);
    }
    function justLinkCurrentProfile(){
        let callbackFn = err => {
            if(err){
                log.error('Mongodb Error', { code: 1040, err: { message: err.message, name: err.name } });
                callback(500, new ErrorResponse(1040, 'Database Error'));
            } else {
                callback(200, { success: true, newProfile: false });
            }
        };

        Profile.findOneAndUpdate({ _id: new ObjectID(targetAccountDoc.pid) }, { $set: { fb: fbId } }, callbackFn);
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 54, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }
    function tryToDestroyAbandonedSession(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 55, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(500, new ErrorResponse(341, 'No account or malformed session. Try to get new one'));
        };

        sessionKeeper.destroySession(sessionObject, callbackFn);
    }

    checkInputs();
}
function unlinkSocialProfile(sessionObject, callback){
    var targetAccountDoc;

    function checkSession(){
        if(!sessionObject.aid){
            tryToDestroyAbandonedSession();
        } else {
            getAndCheckAccount();
        }
    }
    function getAndCheckAccount(){
        let callbackFn = (err, doc) => {
            if(err){
                log.error('Mongodb Error', { code: 56, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(56, 'Database Error'));
            } else if(!doc){
                tryToDestroyAbandonedSession();
            } else {
                targetAccountDoc = doc;
                if(targetAccountDoc.vk || targetAccountDoc.fb || targetAccountDoc.ok){
                    if(targetAccountDoc.gClientId){
                        justUnlockSession(400, new ErrorResponse(1041, 'Account is bi-login. This is irreversible'));
                    } else {
                        justUnlockSession(400, new ErrorResponse(57, 'It is not a native account and cannot be unlinked'));
                    }
                } else if(targetAccountDoc.pid && !targetAccountDoc.npid){
                    justUnlockSession(400, new ErrorResponse(58, 'This account is not linked'));
                } else if(!targetAccountDoc.pid && !targetAccountDoc.npid){
                    justUnlockSession(400, new ErrorResponse(59, 'You don\'t have a main profile to link one more'));
                } else {
                    destroySessionBeforeUnlink();
                }
            }
        };

        Account.findOne(
            { _id: new ObjectID(sessionObject.aid) },
            { projection: { vk: 1, ok: 1, fb: 1, gClientId: 1, pid: 1, npid: 1 } },
            callbackFn
        );
    }
    function tryToDestroyAbandonedSession(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 60, err: { code: err.code, command: err.command, message: err.message } });
            }
            justUnlockSession(500, new ErrorResponse(61, 'No account or malformed session. Try to get new one'));
        };

        sessionKeeper.destroySession(sessionObject, callbackFn);
    }
    function destroySessionBeforeUnlink(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 62, err: { code: err.code, command: err.command, message: err.message } });
                justUnlockSession(500, new ErrorResponse(62, 'OP Error'));
            } else {
                doUnlink();
            }
        };

        sessionKeeper.destroySession(sessionObject, callbackFn);
    }
    function doUnlink(){
        let callbackFn = err => {
            if(err){
                log.error('Mongodb Error', { code: 63, err: { message: err.message, name: err.name } });
                callback(500, new ErrorResponse(63, 'Database Error'));
            } else {
                callback(200);
            }
        };

        Account.findOneAndUpdate(
            { _id: new ObjectID(sessionObject.aid) },
            { $set: { pid: targetAccountDoc.npid }, $unset: { npid: 1 } },
            callbackFn
        );
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 64, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkSession();
}