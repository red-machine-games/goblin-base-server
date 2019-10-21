'use strict';

const SEGMENT_NAME_REGEXP = /[a-z0-9_]{1,24}$/;

module.exports = {
    initFromPersistence,
    tryToRefreshRecords,

    refreshVkFriendsCache,
    refreshFbFriendsCache,
    refreshOkFriendsCache,

    postARecord,
    postARecordImplementation,
    getPlayerRecord,
    getLeadersOverall,
    getLeadersWithinFriends,
    getSomeonesRating,
    removeRecord,

    _resetLazyTimeouts,

    SEGMENT_NAME_REGEXP
};

const goblinBase = require('../../../index.js').getGoblinBase(),
    log = goblinBase.logsHook;

const INT32_MAX = 2147483647;

var _ = require('lodash'),
    async = require('async'),
    crc32 = require('crc-32'),
    ObjectID = require('mongodb').ObjectID;

var opClients = require('../../operativeSubsystem/opClients.js'),
    sessionKeeper = require('../../webMiddleware/sessionKeeper.js'),
    opResourceLocker = require('../../generalUtils/opResourceLocker.js');

var ErrorResponse = require('../../objects/ErrorResponse.js');

var Record = require('../../persistenceSubsystem/dao/record.js'),
    Profile = require('../../persistenceSubsystem/dao/profile.js'),
    RecordCounter = require('../../persistenceSubsystem/dao/sequenceCounter.js');

var seedPageTime, batchSize, refreshPackageTimeout, allRefreshTimeout, socFriendsCacheTtl;

if(goblinBase.leaderboardsConfig){
    seedPageTime = goblinBase.leaderboardsConfig.numericConstants.seedPageTime;
    batchSize = goblinBase.leaderboardsConfig.numericConstants.batchSize;
    refreshPackageTimeout = goblinBase.leaderboardsConfig.numericConstants.refreshPackageTimeout;
    allRefreshTimeout = goblinBase.leaderboardsConfig.numericConstants.allRefreshTimeout;
    socFriendsCacheTtl = goblinBase.leaderboardsConfig.numericConstants.socFriendsCacheTtl;
}

var refreshRecordsLazyTimeout = _.now();

function _resetLazyTimeouts(){
    refreshRecordsLazyTimeout = _.now();
}

function initFromPersistence(callback){
    log.info('initFromPersistence @ records.js...');

    var now = _.now(),
        recordsCount, fromPage = 0, thePage, lockKey, mongoCursor, isOver = false;

    function checkIfRedisIsSeeded(){
        log.info('initFromPersistence @ records.js... checkIfRedisIsSeeded...');
        let callbackFn = (err, response) => {
            if(err){
                log.info('initFromPersistence @ records.js... checkIfRedisIsSeeded... ERROR');
                callback(err, null);
            } else if(response[0] === 0){
                log.info('initFromPersistence @ records.js... checkIfRedisIsSeeded... OK (seeded)');
                callback(null, false);
            } else {
                log.info('initFromPersistence @ records.js... checkIfRedisIsSeeded... OK (not seeded)');
                lockKey = response[1];
                fromPage = _.parseIntOrNull(response[2]);
                recordsCount = _.parseIntOrNull(response[3]);

                if(_.isNull(recordsCount)){
                    countRecords();
                } else {
                    mongoCursor = Record
                        .find({})
                        .project({ _id: 0 })
                        .skip(fromPage)
                        .batchSize(batchSize);
                    cursorNext();
                }
            }
        };

        opClients.getRecordsClient().checkLeaderboardIsSeeded([now, seedPageTime], callbackFn);
    }
    function countRecords(){
        log.info('initFromPersistence @ records.js... countRecords...');
        let callbackFn = (err, response) => {
            if(err){
                log.info('initFromPersistence @ records.js... countRecords... ERROR');
                callback(err, null);
            } else {
                recordsCount = response;
                if(!recordsCount){
                    log.info('initFromPersistence @ records.js... countRecords... OK (COUNT = 0)');
                    callback(null, false);
                } else {
                    log.info('initFromPersistence @ records.js... countRecords... OK');
                    updateSeedingTo();
                }
            }
        };

        Record.countDocuments(callbackFn);
    }
    function updateSeedingTo(){
        log.info('initFromPersistence @ records.js... updateSeedingTo...');
        let callbackFn = (err, response) => {
            if(err){
                log.error('initFromPersistence @ records.js... updateSeedingTo... ERROR', err);
                callback(err, null);
            } else {
                if(+response === 1){
                    log.info('initFromPersistence @ records.js... updateSeedingTo... OK');
                    mongoCursor = Record
                        .find({})
                        .project({ _id: 0 })
                        .batchSize(batchSize);
                    cursorNext();
                } else {
                    log.info('initFromPersistence @ records.js... updateSeedingTo... (Locked by some one else)');
                    callback(null, false);
                }
            }
        };

        opClients.getRecordsClient().updateSeedingLeaderboardCache([recordsCount, lockKey, now], callbackFn);
    }
    function cursorNext(){
        let callbackFn = (err, doc) => {
            if(err){
                log.error('initFromPersistence @ records.js... cursorNext... ERROR', err);
                callback(err, null);
            } else if(doc){
                if(!thePage){
                    thePage = []
                }
                thePage.push({ pid: doc.pid, val: doc.val, segment: doc.segm });
                if(thePage.length === batchSize){
                    fromPage += batchSize;
                    getPlayers();
                } else {
                    cursorNext();
                }
            } else {
                isOver = true;
                getPlayers();
            }
        };

        mongoCursor.next(callbackFn);
    }
    function getPlayers(){
        if(thePage && thePage.length){
            let callbackFn = (err, docsFound) => {
                if(err){
                    log.error('initFromPersistence @ records.js... getPlayers... ERROR', err);
                    callback(err, null);
                } else {
                    _.each(docsFound, doc => {
                        var p = thePage.filter(e => e.pid.equals(doc._id));
                        _.each(p, r => {
                            r.vk = doc.vk || -1;
                            r.fb = doc.fb || -1;
                            r.ok = doc.ok || -1;
                        });
                    });
                    cacheRecords();
                }
            };

            Profile.find(
                { _id: { $in: thePage.map(e => new ObjectID(e.pid)) } },
                { project: { _id: 1, vk: 1, fb: 1, ok: 1 } }
            ).toArray(callbackFn);
        } else {
            cacheRecords();
        }
    }
    function cacheRecords(){
        if(isOver && (!thePage || (thePage && !thePage.length))){
            log.info('initFromPersistence @ records.js... cacheRecords... OK (over)');
            callback(null, false);
        } else {
            log.info('initFromPersistence @ records.js... cacheRecords...');
            let callbackFn = (err, response) => {
                if(err){
                    log.error('initFromPersistence @ records.js... cacheRecords... ERROR', err);
                    callback(err, null);
                } else if(isOver){
                    log.info(`initFromPersistence @ records.js... cacheRecords... OK (over / from ${fromPage} to ${fromPage + thePage.length})`);
                    callback(null, true);
                } else {
                    response = +response;
                    if(response === 0){
                        log.info('initFromPersistence @ records.js... cacheRecords... OK (interrupted)');
                        callback(null, false);
                    } else if(response === 1){
                        log.info(`initFromPersistence @ records.js... cacheRecords... OK (continue / from ${fromPage} to ${fromPage + thePage.length})`);
                        thePage = null;
                        cursorNext();
                    } else if(response === 2){
                        log.info('initFromPersistence @ records.js... cacheRecords... OK (continue from beginning)');
                        checkIfRedisIsSeeded();
                    }
                }
            };

            let args = [fromPage, lockKey, now, goblinBase.leaderboardsConfig.numericConstants.operativeRecordLifetime];
            _.each(thePage, data => args.push(data.pid.toString(), data.val, data.segment, data.vk, data.fb, data.ok));
            opClients.getRecordsClient().seedManyRecords(args, callbackFn);
        }
    }

    checkIfRedisIsSeeded();
}
function tryToRefreshRecords(now, callback){
    var recordsCount, fromPage, thePage, lockKey;

    function tryToLockRefresh(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 151, err: { code: err.code, command: err.command, message: err.message } });
                callback(new ErrorResponse(151, 'OP Error'));
            } else if(response[0] === 0){
                callback(null, false);
            } else {
                lockKey = _.isUndefined(response[3]) ? 1 : response[3];
                if(response[2] && response[2] > 0){
                    fromPage = response[1] || 0;
                    recordsCount = response[2];
                    nextPage();
                } else {
                    getRecordsRange();
                }
            }
        };

        opClients.getRecordsClient()
            .tryToLockRecordsRefresh([now, refreshPackageTimeout, allRefreshTimeout], callbackFn);
    }
    function getRecordsRange(){
        let callbackFn = (err, responses) => {
            if(err){
                log.error('Mongodb Error', { code: 983, err: { message: err.message, name: err.name } });
                callback(new ErrorResponse(983, 'Database Error'), null);
            } else if(responses.length){
                let hid1 = responses[0] ? responses[0].hid || 0 : 0,
                    hid2 = responses[1] ? responses[1].hid || 0 : 0;
                fromPage = Math.min(hid1, hid2);
                recordsCount = Math.max(hid1, hid2);
                updateSeedingTo();
            } else {
                refreshCacheOnlyLTI();
            }
        };

        async.parallel([
            cb => Record.findOne({}, { sort: { _id: 1 }, projection: { hid: 1 } }, cb),
            cb => Record.findOne({}, { sort: { _id: -1 }, projection: { hid: 1 } }, cb)
        ], callbackFn);
    }
    function updateSeedingTo(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 149, err: { code: err.code, command: err.command, message: err.message } });
                callback(new ErrorResponse(149, 'OP Error'));
            } else if(response === 1){
                nextPage();
            } else {
                callback(null, false);
            }
        };

        opClients.getRecordsClient().updateRefreshingRecordsCache([recordsCount, lockKey], callbackFn);
    }
    function nextPage(){
        let callbackFn = (err, docs) => {
            if(err){
                log.error('Mongodb Error', { code: 148, err: { message: err.message, name: err.name } });
                callback(new ErrorResponse(148, 'Database Error'));
            } else {
                thePage = docs.map(e => { return { pid: e.pid, val: e.val, segment: e.segm, hid: e.hid } });
                if(!docs.length){
                    fromPage += theLimit;
                } else {
                    fromPage = parseInt(_.last(docs).hid);
                }
                getPlayers();
            }
        };

        var theLimit = Math.min(batchSize, recordsCount - fromPage + 1);
        Record.find({ hid: { $gte: fromPage, $lt: fromPage + theLimit }}, { sort: { hid: 1 } }).toArray(callbackFn);
    }
    function getPlayers(){
        if(thePage.length){
            let callbackFn = (err, docsFound) => {
                if(err){
                    log.error('Mongodb Error', { code: 147, err: { message: err.message, name: err.name } });
                    callback(new ErrorResponse(147, 'Database Error'));
                } else {
                    _.each(docsFound, doc => {
                        var p = thePage.filter(e => e.pid.equals(doc._id));
                        _.each(p, r => {
                            r.vk = doc.vk;
                            r.fb = doc.fb;
                            r.ok = doc.ok;
                        });
                    });
                    refreshCache();
                }
            };

            Profile.find(
                { _id: { $in: thePage.map(e => new ObjectID(e.pid)) } },
                { projection: { _id: 1, vk: 1, fb: 1, ok: 1 } }
            ).toArray(callbackFn);
        } else {
            refreshCache();
        }
    }
    function refreshCacheOnlyLTI(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 679, err: { code: err.code, command: err.command, message: err.message } });
                callback(new ErrorResponse(679, 'OP Error'));
            } else {
                callback(null, true);
            }
        };

        opClients.getRecordsClient().refreshRecordsCache([
            fromPage, lockKey, now,
            goblinBase.leaderboardsConfig.numericConstants.operativeRecordLifetime
        ], callbackFn);
    }
    function refreshCache(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 519, err: { code: err.code, command: err.command, message: err.message } });
                callback(new ErrorResponse(519, 'OP Error'));
            } else {
                switch(thePage.length){
                    case 0:
                        log.info('Records refreshCache... REFRESHED 0');
                        break;
                    case 1:
                        log.info(`Records refreshCache... REFRESHED ONLY ${thePage[0].hid}`);
                        break;
                    default:
                        log.info(`Records refreshCache... REFRESHED FROM ${_.first(thePage).hid} ` +
                            `TO ${_.last(thePage).hid}`);
                }
                callback(null, true);
            }
        };

        var args = [fromPage, lockKey, now, goblinBase.leaderboardsConfig.numericConstants.operativeRecordLifetime];
        _.each(thePage, data => args.push(
            data.pid.toString(), data.val, data.segment,
            data.vk || -1, data.fb || -1, data.ok || -1
        ));
        opClients.getRecordsClient().refreshRecordsCache(args, callbackFn);
    }

    if(goblinBase.leaderboardsConfig && now > refreshRecordsLazyTimeout){
        refreshRecordsLazyTimeout = now + refreshPackageTimeout;
        tryToLockRefresh();
    } else {
        callback(null, false);
    }
}

function refreshVkFriendsCache(sessionObject, forceFriends, crcFriends, callback){
    var vkFriendsIds, vkFriendsHash;

    function checkInput(){
        if((!forceFriends || !_.isString(forceFriends)) && (!crcFriends || !_.isString(crcFriends))){
            justUnlockSession(400, new ErrorResponse(153, 'Invalid input'));
        } else {
            checkSession();
        }
    }
    function checkSession(){
        if(sessionObject.aid){
            if(!sessionObject.pcrd || !sessionObject.pid || !sessionObject.hid){
                justUnlockSession(400, new ErrorResponse(154, 'You do not have a profile or should get one'));
            } else if(!sessionObject.vkId){
                justUnlockSession(400, new ErrorResponse(155, 'You are not a vk player'));
            } else {
                parseInput();
            }
        } else {
            justUnlockSession(500, new ErrorResponse(156, 'Malformed session'));
        }
    }
    function parseInput(){
        if(forceFriends){
            vkFriendsIds = forceFriends;
            vkFriendsHash = crc32.str(vkFriendsIds);
            vkFriendsIds += `,${sessionObject.vkId}`;
            cacheFriends();
        } else if(crcFriends){
            vkFriendsHash = crcFriends;
            checkCachedFriends()
        }
    }
    function checkCachedFriends(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 157, err: { code: err.code, command: err.command, message: err.message } });
                justUnlockSession(500, new ErrorResponse(157, 'OP Error'));
            } else if(response){
                if(vkFriendsHash.toString() !== response){
                    justUnlockSession(400, new ErrorResponse(158, 'Wrong friends hash'));
                } else {
                    justUnlockSession(200);
                }
            } else {
                justUnlockSession(400, new ErrorResponse(159, 'No friends hash'));
            }
        };

        opClients.getRecordsClient().getRedis().get(`vkfr_hsh:${sessionObject.vkId}`, callbackFn);
    }
    function cacheFriends(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 160, err: { code: err.code, command: err.command, message: err.message } });
                justUnlockSession(500, new ErrorResponse(160, 'OP Error'));
            } else {
                justUnlockSession(200);
            }
        };

        opClients.getRecordsClient().cacheVkFriends(
            [sessionObject.vkId, vkFriendsHash, socFriendsCacheTtl].concat(vkFriendsIds.split(',')),
            callbackFn
        );
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 161, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkInput();
}
function refreshFbFriendsCache(sessionObject, forceFriends, crcFriends, callback){
    var fbFriendsIds, fbFriendsHash;

    function checkInput(){
        if((!forceFriends || !_.isString(forceFriends)) && (!crcFriends || !_.isString(crcFriends))){
            justUnlockSession(400, new ErrorResponse(162, 'Invalid input'));
        } else {
            checkSession();
        }
    }
    function checkSession(){
        if(sessionObject.aid){
            if(!sessionObject.pcrd || !sessionObject.pid || !sessionObject.hid){
                justUnlockSession(400, new ErrorResponse(163, 'You do not have a profile or should get one'));
            } else if(!sessionObject.fbId){
                justUnlockSession(400, new ErrorResponse(164, 'You are not a fb player'));
            } else {
                parseInput();
            }
        } else {
            justUnlockSession(500, new ErrorResponse(165, 'Malformed session'));
        }
    }
    function parseInput(){
        if(forceFriends){
            fbFriendsIds = forceFriends;
            fbFriendsHash = crc32.str(fbFriendsIds);
            fbFriendsIds += `,${sessionObject.fbId}`;
            cacheFriends();
        } else if(crcFriends){
            fbFriendsHash = crcFriends;
            checkCachedFriends()
        }
    }
    function checkCachedFriends(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 166, err: { code: err.code, command: err.command, message: err.message } });
                justUnlockSession(500, new ErrorResponse(166, 'OP Error'));
            } else if(response){
                if(fbFriendsHash.toString() !== response){
                    justUnlockSession(400, new ErrorResponse(167, 'Wrong friends hash'));
                } else {
                    justUnlockSession(200);
                }
            } else {
                justUnlockSession(400, new ErrorResponse(168, 'No friends hash'));
            }
        };

        opClients.getRecordsClient().getRedis().get(`fbfr_hsh:${sessionObject.fbId}`, callbackFn);
    }
    function cacheFriends(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 169, err: { code: err.code, command: err.command, message: err.message } });
                justUnlockSession(500, new ErrorResponse(169, 'OP Error'));
            } else {
                justUnlockSession(200);
            }
        };

        opClients.getRecordsClient().cacheFbFriends(
            [sessionObject.fbId, fbFriendsHash, socFriendsCacheTtl].concat(fbFriendsIds.split(',')),
            callbackFn
        );
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 170, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkInput();
}
function refreshOkFriendsCache(sessionObject, forceFriends, crcFriends, callback){
    var okFriendsIds, okFriendsHash;

    function checkInput(){
        if((!forceFriends || !_.isString(forceFriends)) && (!crcFriends || !_.isString(crcFriends))){
            justUnlockSession(400, new ErrorResponse(518, 'Invalid input'));
        } else {
            checkSession();
        }
    }
    function checkSession(){
        if(sessionObject.aid){
            if(!sessionObject.pcrd || !sessionObject.pid || !sessionObject.hid){
                justUnlockSession(400, new ErrorResponse(511, 'You do not have a profile or should get one'));
            } else if(!sessionObject.okId){
                justUnlockSession(400, new ErrorResponse(510, 'You are not a ok player'));
            } else {
                parseInput();
            }
        } else {
            justUnlockSession(500, new ErrorResponse(517, 'Malformed session'));
        }
    }
    function parseInput(){
        if(forceFriends){
            okFriendsIds = forceFriends;
            okFriendsHash = crc32.str(okFriendsIds);
            okFriendsIds += `,${sessionObject.okId}`;
            cacheFriends();
        } else if(crcFriends){
            okFriendsHash = crcFriends;
            checkCachedFriends()
        }
    }
    function checkCachedFriends(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 578, err: { code: err.code, command: err.command, message: err.message } });
                justUnlockSession(500, new ErrorResponse(578, 'OP Error'));
            } else if(response){
                if(okFriendsHash.toString() !== response){
                    justUnlockSession(400, new ErrorResponse(579, 'Wrong friends hash'));
                } else {
                    justUnlockSession(200);
                }
            } else {
                justUnlockSession(400, new ErrorResponse(580, 'No friends hash'));
            }
        };

        opClients.getRecordsClient().getRedis().get(`okfr_hsh:${sessionObject.okId}`, callbackFn);
    }
    function cacheFriends(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 581, err: { code: err.code, command: err.command, message: err.message } });
                justUnlockSession(500, new ErrorResponse(581, 'OP Error'));
            } else {
                justUnlockSession(200);
            }
        };

        opClients.getRecordsClient().cacheOkFriends(
            [sessionObject.okId, okFriendsHash, socFriendsCacheTtl].concat(okFriendsIds.split(',')),
            callbackFn
        );
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 582, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkInput();
}

function postARecord(sessionObject, value, segment, callback){
    var theLock, sessionDelta = null;

    function checkInput(){
        if(!_.isNumber(value) || isNaN(value) || !_.isString(segment) || value < 0 || value > INT32_MAX || !SEGMENT_NAME_REGEXP.test(segment)){
            justUnlockSession(400, new ErrorResponse(171, 'Invalid input'));
        } else {
            checkSegment();
        }
    }
    function checkSegment(){
        if(goblinBase.leaderboardsConfig.whitelistSegments){
            if(_.includes(goblinBase.leaderboardsConfig.whitelistSegments, segment)){
                checkSession();
            } else {
                justUnlockSession(400, new ErrorResponse(642, 'Unknown segment'));
            }
        } else {
            checkSession();
        }
    }
    function checkSession(){
        if(sessionObject.aid){
            if(!sessionObject.pcrd || !sessionObject.pid || !sessionObject.hid){
                justUnlockSession(400, new ErrorResponse(172, 'You do not have a profile or should get one'));
            } else {
                acquireResourceLock();
            }
        } else {
            justUnlockSession(500, new ErrorResponse(173, 'Malformed session'));
        }
    }
    function acquireResourceLock(){
        let callbackFn = (err, _theLock) => {
            if(err){
                callback(500, err);
            } else {
                theLock = _theLock;
                doThePostJob();
            }
        };

        opResourceLocker.getLock(sessionObject.hid, callbackFn);
    }
    function doThePostJob(){
        postARecordImplementation(
            sessionObject.pid,
            sessionObject.vkId,
            sessionObject.fbId,
            sessionObject.okId,
            segment, value,
            returnResourcesLock
        );
    }
    function returnResourcesLock(code, response){
        opResourceLocker.returnLock(theLock, () => justUnlockSession(code, response));
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 176, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(sessionDelta, sessionObject, null, callbackFn);
    }

    checkInput();
}
function postARecordImplementation(pid, playerVkId, playerFbId, playerOkId, segment, value, callback){
    var recordHumanId, pidStr;

    function checkSegmentRecordInDb(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('Mongodb Error', { code: 523, err: { message: err.message, name: err.name } });
                callback(500, new ErrorResponse(523, 'Database Error'));
            } else if(response){
                recordHumanId = null;
                persistThatRecord();
            } else {
                getHumanIdForRecord();
            }
        };

        pidStr = pid;
        pid = new ObjectID(pid);
        Record.findOne({ pid, segm: segment }, { projection: { pid: 1 } }, callbackFn);
    }
    function getHumanIdForRecord(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('Mongodb Error', { code: 80, err: { message: err.message, name: err.name } });
                callback(500, new ErrorResponse(80, 'Database Error'));
            } else {
                recordHumanId = response;
                persistThatRecord();
            }
        };

        getNextSequenceValue(1, callbackFn);
    }
    function persistThatRecord(){
        let callbackFn = err => {
            if(err){
                log.error('Mongodb Error', { code: 174, err: { message: err.message, name: err.name } });
                callback(500, new ErrorResponse(174, 'Database Error'));
            } else {
                putRecordToRedis();
            }
        };

        Record.findOneAndUpdate(
            { pid, segm: segment },
            { $set: { pid, segm: segment, val: value }, $setOnInsert: { hid: recordHumanId } },
            { upsert: true },
            callbackFn
        );
    }
    function putRecordToRedis(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 175, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(200);
        };

        opClients.getRecordsClient().postARecord([
            pidStr, segment,
            playerVkId || -1,
            playerFbId || -1,
            playerOkId || -1,
            value,
            goblinBase.leaderboardsConfig.numericConstants.operativeRecordLifetime
        ], callbackFn);
    }

    checkSegmentRecordInDb();
}
function getPlayerRecord(sessionObject, segment, callback){
    var sessionDelta = null, valItself;

    function checkInput(){
        if(!_.isString(segment) || !segment || segment.length > 24){
            justUnlockSession(400, new ErrorResponse(177, 'Invalid input'));
        } else {
            checkSegment();
        }
    }
    function checkSegment(){
        if(goblinBase.leaderboardsConfig.whitelistSegments){
            if(_.includes(goblinBase.leaderboardsConfig.whitelistSegments, segment)){
                checkSession();
            } else {
                justUnlockSession(400, new ErrorResponse(643, 'Unknown segment'));
            }
        } else {
            checkSession();
        }
    }
    function checkSession(){
        if(sessionObject.aid){
            if(!sessionObject.pcrd || !sessionObject.pid || !sessionObject.hid){
                justUnlockSession(400, new ErrorResponse(178, 'You do not have a profile or should get one'));
            } else {
                getThatRecord();
            }
        } else {
            justUnlockSession(500, new ErrorResponse(179, 'Malformed session'));
        }
    }
    function getThatRecord(){
        let callbackFn = (err, docFound) => {
            if(err){
                log.error('Mongodb Error', { code: 180, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(180, 'Database Error'));
            } else if(docFound){
                valItself = docFound.val;
                getThePlace();
            } else {
                justUnlockSession(404);
            }
        };

        Record.findOne({ pid: new ObjectID(sessionObject.pid), segm: segment }, { projection: { val: 1 } }, callbackFn);
    }
    function getThePlace(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 1096, err: { code: err.code, command: err.command, message: err.message } });
                justUnlockSession(500, new ErrorResponse(1096, 'OP Error'));
            } else {
                justUnlockSession(200, { rec: valItself, rank: response + 1 });
            }
        };

        if(goblinBase.leaderboardsConfig.order === 'desc'){
            opClients.getRecordsClient().getRedis().zrevrank(`rc:${segment}`, sessionObject.pid, callbackFn);
        } else {
            opClients.getRecordsClient().getRedis().zrank(`rc:${segment}`, sessionObject.pid, callbackFn);
        }
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 181, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(sessionDelta, sessionObject, null, callbackFn);
    }

    checkInput();
}
function getLeadersOverall(sessionObject, skip, limit, segment, callback){
    var sessionDelta = null, leaderboard;

    function checkInput(){
        if(!_.isString(segment) || !segment || segment.length > 24){
            justUnlockSession(400, new ErrorResponse(182, 'Invalid input'));
        } else {
            skip = parseInt(skip) || 0;
            limit = parseInt(limit) || 20;
            if(skip < 0 || skip > INT32_MAX || limit < 0 || limit > 20){
                justUnlockSession(400, new ErrorResponse(183, 'Invalid input'));
            } else {
                checkSegment();
            }
        }
    }
    function checkSegment(){
        if(goblinBase.leaderboardsConfig.whitelistSegments){
            if(_.includes(goblinBase.leaderboardsConfig.whitelistSegments, segment)){
                checkSession();
            } else {
                justUnlockSession(400, new ErrorResponse(644, 'Unknown segment'));
            }
        } else {
            checkSession();
        }
    }
    function checkSession(){
        if(sessionObject){
            if(sessionObject.aid){
                if(!sessionObject.pcrd || !sessionObject.pid || !sessionObject.hid){
                    justUnlockSession(400, new ErrorResponse(184, 'You do not have a profile or should get one'));
                } else {
                    doGetLeaders();
                }
            } else {
                justUnlockSession(500, new ErrorResponse(185, 'Malformed session'));
            }
        } else if(goblinBase.leaderboardsConfig.allowPublicListing){
            doGetLeaders();
        } else {
            justUnlockSession(400, new ErrorResponse(678, 'Public listing is not allowed'));
        }
    }
    function doGetLeaders(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 186, err: { code: err.code, command: err.command, message: err.message } });
                justUnlockSession(500, new ErrorResponse(186, 'OP Error'));
            } else if(response){
                let topAndLen = response.split(';'),
                    top = !_.isEmpty(topAndLen[0]) ? topAndLen[0].split(',') : null;

                leaderboard.len = parseInt(topAndLen[1]);

                _.each(top, t => {
                    var idAndScore = t.split('-'),
                        pid = idAndScore[0],
                        score = parseInt(idAndScore[1]);
                    leaderboard.records.push({ pid, score });
                });

                if(leaderboard.records.length > 0){
                    getLeadersPublicData();
                } else {
                    justUnlockSession(200, leaderboard);
                }
            } else {
                justUnlockSession(200, leaderboard);
            }
        };

        leaderboard = { records: [], len: 0 };
        opClients.getRecordsClient().getTopLeaders(
            [segment, skip, limit, +(goblinBase.leaderboardsConfig.order === 'desc')],
            callbackFn
        );
    }
    function getLeadersPublicData(){
        let callbackFn = (err, docsFound) => {
            if(err){
                log.error('Mongodb Error', { code: 187, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(187, 'Database Error'));
            } else if(docsFound.length){
                _.each(leaderboard.records, rc => {
                    var player = docsFound.find(e => e._id.toString() === rc.pid);
                    delete rc.pid;
                    if(player){
                        rc.hid = player.humanId;
                        if(player.vk){
                            rc.vk = player.vk;
                        }
                        if(player.fb){
                            rc.fb = player.fb;
                        }
                        if(player.publicProfileData){
                            rc.pdata = player.publicProfileData;
                        }
                    }
                });
                justUnlockSession(200, leaderboard);
            } else {
                justUnlockSession(200, { records: [], len: 0 });
            }
        };

        Profile.find(
            { _id: { $in: leaderboard.records.map(e => new ObjectID(e.pid)) } },
            { projection: { _id: 1, vk: 1, fb: 1, publicProfileData: 1, humanId: 1 }, limit: leaderboard.records.length }
        ).toArray(callbackFn);
    }
    function justUnlockSession(code, response){
        if(sessionObject){
            let callbackFn = err => {
                if(err){
                    log.error('OP Error', { code: 188, err: { code: err.code, command: err.command, message: err.message } });
                }
                callback(code, response);
            };

            sessionKeeper.flushSession(sessionDelta, sessionObject, null, callbackFn);
        } else {
            callback(code, response);
        }
    }

    checkInput();
}
function getLeadersWithinFriends(sessionObject, skip, limit, segment, callback){
    var sessionDelta = null, socialIdentifier, leaderboard;

    function checkInput(){
        if(!_.isString(segment) || !segment || segment.length > 24){
            justUnlockSession(400, new ErrorResponse(189, 'Invalid input'));
        } else {
            skip = parseInt(skip) || 0;
            limit = parseInt(limit) || 20;
            if(skip < 0 || skip > INT32_MAX || limit < 0 || limit > 20){
                justUnlockSession(400, new ErrorResponse(190, 'Invalid input'));
            } else {
                checkSegment();
            }
        }
    }
    function checkSegment(){
        var whitelistSegments = goblinBase.leaderboardsConfig.whitelistSegments;
        if(whitelistSegments){
            if(_.includes(whitelistSegments, segment)){
                checkSession();
            } else {
                justUnlockSession(400, new ErrorResponse(645, 'Unknown segment'));
            }
        } else {
            checkSession();
        }
    }
    function checkSession(){
        if(sessionObject.aid){
            if(!sessionObject.pcrd || !sessionObject.pid || !sessionObject.hid){
                justUnlockSession(400, new ErrorResponse(191, 'You do not have a profile or should get one'));
            } else if(!sessionObject.vkId && !sessionObject.okId && !sessionObject.fbId){
                justUnlockSession(400, new ErrorResponse(192, 'You are not a social player'));
            } else {
                doGetLeaders();
            }
        } else {
            justUnlockSession(500, new ErrorResponse(193, 'Malformed session'));
        }
    }
    function doGetLeaders(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 194, err: { code: err.code, command: err.command, message: err.message } });
                justUnlockSession(500, new ErrorResponse(194, 'OP Error'));
            } else if(response){
                let topAndLen = response.split(';'),
                    top = !_.isEmpty(topAndLen[0]) ? topAndLen[0].split(',') : null;

                leaderboard.len = parseInt(topAndLen[1]);

                _.each(top, t => {
                    var idAndScore = t.split('-'),
                        socId = idAndScore[0],
                        score = parseInt(idAndScore[1]);
                    leaderboard.records.push({ socId, score });
                });

                if(leaderboard.records.length > 0){
                    getLeadersPublicData();
                } else {
                    justUnlockSession(200, leaderboard);
                }
            } else {
                justUnlockSession(200);
            }
        };

        var socialId;
        if(sessionObject.vkId){
            socialIdentifier = 'vk';
            socialId = sessionObject.vkId;
        } else if(sessionObject.fbId){
            socialIdentifier = 'fb';
            socialId = sessionObject.fbId;
        } else if(sessionObject.okId){
            socialIdentifier = 'ok';
            socialId = sessionObject.okId;
        }
        leaderboard = { records: [], len: 0 };
        opClients.getRecordsClient().getLeadersWithinFriends([
            socialId,
            segment,
            skip, limit,
            socialIdentifier,
            +(goblinBase.leaderboardsConfig.order === 'desc')
        ], callbackFn);
    }
    function getLeadersPublicData(){
        let callbackFn = (err, docsFound) => {
            if(err){
                log.error('Mongodb Error', { code: 195, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(195, 'Database Error'));
            } else if(docsFound.length){
                _.each(leaderboard.records, rc => {
                    var player = docsFound.find(e => e[socialIdentifier] === rc.socId);
                    delete rc.socId;
                    if(player){
                        rc[socialIdentifier] = player[socialIdentifier];
                        rc.hid = player.humanId;
                        if(player.publicProfileData){
                            rc.pdata = player.publicProfileData;
                        }
                    }
                });
                justUnlockSession(200, leaderboard);
            } else {
                justUnlockSession(200);
            }
        };

        Profile.find(
            { [socialIdentifier]: { $in: leaderboard.records.map(e => e.socId) } },
            { projection: { [socialIdentifier]: 1, publicProfileData: 1, humanId: 1 }, limit: leaderboard.records.length }
        ).toArray(callbackFn);
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 196, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(sessionDelta, sessionObject, null, callbackFn);
    }

    checkInput();
}
function getSomeonesRating(sessionObject, targetHumanId, fromSegment, callback){
    var targetProfilePid, valItself;

    function checkInput(){
        if(!targetHumanId || isNaN(targetHumanId) || !_.isString(fromSegment) || !fromSegment || fromSegment.length > 24){
            justUnlockSession(400, new ErrorResponse(1005, 'Invalid input'));
        } else {
            checkSegment();
        }
    }
    function checkSegment(){
        if(goblinBase.leaderboardsConfig.whitelistSegments){
            if(_.includes(goblinBase.leaderboardsConfig.whitelistSegments, fromSegment)){
                checkSession();
            } else {
                justUnlockSession(400, new ErrorResponse(1006, 'Unknown segment'));
            }
        } else {
            checkSession();
        }
    }
    function checkSession(){
        if(sessionObject.aid){
            if(!sessionObject.pcrd || !sessionObject.pid || !sessionObject.hid){
                justUnlockSession(400, new ErrorResponse(1007, 'You do not have a profile or should get one'));
            } else {
                getTargetProfilePid();
            }
        } else {
            justUnlockSession(500, new ErrorResponse(1008, 'Malformed session'));
        }
    }
    function getTargetProfilePid(){
        let callbackFn = (err, docFound) => {
            if(err){
                log.error('Mongodb Error', { code: 1054, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(1054, 'Database Error'));
            } else if(docFound){
                targetProfilePid = docFound._id;
                getThatRecord();
            } else {
                justUnlockSession(400, new ErrorResponse(1055, 'No such human ID'));
            }
        };

        Profile.findOne({ humanId: targetHumanId }, { projection: { _id: 1 } }, callbackFn);
    }
    function getThatRecord(){
        let callbackFn = (err, docFound) => {
            if(err){
                log.error('Mongodb Error', { code: 1009, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(1009, 'Database Error'));
            } else if(docFound){
                valItself = docFound.val;
                getThePlace();
            } else {
                justUnlockSession(404);
            }
        };

        Record.findOne({ pid: targetProfilePid, segm: fromSegment }, { projection: { val: 1 } }, callbackFn);
    }
    function getThePlace(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 1097, err: { code: err.code, command: err.command, message: err.message } });
                justUnlockSession(500, new ErrorResponse(1097, 'OP Error'));
            } else {
                justUnlockSession(200, { rec: valItself, hid: targetHumanId, rank: response + 1 });
            }
        };

        if(goblinBase.leaderboardsConfig.order === 'desc'){
            opClients.getRecordsClient().getRedis().zrevrank(`rc:${fromSegment}`, targetProfilePid.toString(), callbackFn);
        } else {
            opClients.getRecordsClient().getRedis().zrank(`rc:${fromSegment}`, targetProfilePid.toString(), callbackFn);
        }
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 1010, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkInput();
}
function removeRecord(sessionObject, segment, callback){
    var sessionDelta = null, someProfileData;

    function checkInput(){
        if(!segment || segment.length > 24){
            justUnlockSession(400, new ErrorResponse(683, 'Invalid input'));
        } else {
            checkSession();
        }
    }
    function checkSession(){
        if(sessionObject.aid){
            if(!sessionObject.pcrd || !sessionObject.pid || !sessionObject.hid){
                justUnlockSession(400, new ErrorResponse(172, 'You do not have a profile or should get one'));
            } else {
                removeRecordFromCollection();
            }
        } else {
            justUnlockSession(500, new ErrorResponse(173, 'Malformed session'));
        }
    }
    function removeRecordFromCollection(){
        let callbackFn = err => {
            if(err){
                log.error('Mongodb Error', { code: 685, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(685, 'Database Error'));
            } else {
                getProfileDataForRemoving();
            }
        };

        Record.findOneAndDelete({ pid: new ObjectID(sessionObject.pid), segm: segment }, callbackFn);
    }
    function getProfileDataForRemoving(){
        let callbackFn = (err, doc) => {
            if(err){
                log.error('Mongodb Error', { code: 689, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(689, 'Database Error'));
            } else {
                someProfileData = doc;
                removeRecordFromOperative();
            }
        };

        Profile.findOne({ _id: new ObjectID(sessionObject.pid) }, { projection: { vk: 1, ok: 1, fb: 1 } }, callbackFn);
    }
    function removeRecordFromOperative(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 691, err: { code: err.code, command: err.command, message: err.message } });
            }
            justUnlockSession(200);
        };

        opClients.getRecordsClient().removeRecord([
            sessionObject.pid, segment,
            someProfileData.vk || '', someProfileData.fb || '',
            someProfileData.ok || ''
        ], callbackFn);
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 692, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(sessionDelta, sessionObject, null, callbackFn);
    }

    checkInput();
}

function getNextSequenceValue(howMuch, callback){
    const SEQUENCE_NAME = 'recordHumanId';

    RecordCounter.getNextSequenceValue(SEQUENCE_NAME, howMuch, callback);
}