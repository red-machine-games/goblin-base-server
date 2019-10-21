'use strict';

module.exports = {
    changeProfileAndStuff,

    checkAtomicActs,
    atomicActsLoop
};

const goblinBase = require('../../../index.js').getGoblinBase(),
    log = goblinBase.logsHook;

const PROFILE_STATE = 0,
    RECORDS_STATE = 1,
    RECEIPTS_STATE = 2,
    BJE_STATE = 3,
    DONE_STATE = 4;

const DUPLICATE_KEY_ERROR = 'E11000 duplicate key error';

var _ = require('lodash'),
    async = require('async'),
    clone = require('clone'),
    cloneDeep = require('clone-deep'),
    ObjectID = require('mongodb').ObjectID;

var profiles = require('../accountsAndProfiles/profiles.js'),
    opClients = require('../../operativeSubsystem/opClients.js'),
    mongodbUtils = require('../../persistenceSubsystem/utils/mongodbUtils.js'),
    opResourceLocker = require('../../generalUtils/opResourceLocker.js');

var AtomicAct = require('../../persistenceSubsystem/dao/atomicAct.js'),
    SequentialCounter = require('../../persistenceSubsystem/dao/sequenceCounter.js'),
    Profile = require('../../persistenceSubsystem/dao/profile.js'),
    Record = require('../../persistenceSubsystem/dao/record.js'),
    Receipt = require('../../persistenceSubsystem/dao/receipt.js'),
    PveBattleModel = require('../../persistenceSubsystem/dao/pveBattle.js'),
    PvpBattleModel = require('../../persistenceSubsystem/dao/battle.js');

var ErrorResponse = require('../../objects/ErrorResponse.js'),
    ErrorResponseWithCode = require('../../objects/ErrorResponseWithCode.js');

var batchSize, refreshPackageTimeout, allRefreshTimeout;

if(goblinBase.cloudFunctionsConfig){
    batchSize = goblinBase.cloudFunctionsConfig.atomic.batchSize;
    refreshPackageTimeout = goblinBase.cloudFunctionsConfig.atomic.refreshPackageTimeout;
    allRefreshTimeout = goblinBase.cloudFunctionsConfig.atomic.allRefreshTimeout;
}

var atomicActsLoopLazyTimeout = _.now();

function changeProfileAndStuff(theLock, byThePid, profileSets, recordSets, receipts, battleJournalEntries,
                               clientPlatform, clientVersion, callback){
    var pids, theNewHid, newAtomicActFullBody;

    function redeemNewHid(){
        let callbackFn = (err, hidValue) => {
            if(global.GFeSgp5g){    // Error emitter for test case "atomicsAreGoodAtFailures-contract.js"
                err = new ErrorResponse(9999, 'GFeSgp5g');
            }
            if(err){
                callback(err);
            } else {
                theNewHid = hidValue;
                persistTheAtomicAction();
            }
        };

        getNextSequenceValueForAtomicAct(callbackFn);
    }
    function persistTheAtomicAction(){
        let callbackFn = (err, result) => {
            if(global.wRgvM8Ea){    // Error emitter for test case "atomicsAreGoodAtFailures-contract.js"
                return callback(new ErrorResponse(9999, 'wRgvM8Ea'));
            }
            if(err){
                log.error('Mongodb Error', { code: 671, err: { message: err.message, name: err.name } });
                callback(new ErrorResponse(671, 'Database Error'));
            } else {
                newAtomicActFullBody = result;
                newAtomicActFullBody.dat = theDat;
                newAtomicActFullBody.tch = pids;
                doTheAct();
            }
        };

        var theDat = {};
        pids = [];
        if(!_.isEmpty(profileSets)){
            theDat.prf = profileSets;
            let pidsFromProfileSets = _.keys(profileSets);
            pids = _.union(pids, pidsFromProfileSets);
        }
        if(!_.isEmpty(recordSets)){
            theDat.rec = recordSets;
            let pidsFromRecords = _.keys(recordSets);
            pids = _.union(pids, pidsFromRecords);
        }
        if(!_.isEmpty(receipts)){
            theDat.rcp = receipts;
            let pidsFromReceipts = receipts.map(e => e.pid);
            pids = _.union(pids, pidsFromReceipts);
        }
        if(!_.isEmpty(battleJournalEntries)){
            theDat.bje = battleJournalEntries;
            let pidsFromBJEs = [];
            _.each(battleJournalEntries, bje => {
                if(bje.pid){
                    pidsFromBJEs.push(bje.pid);
                }
                if(bje.pida){
                    pidsFromBJEs.push(bje.pida);
                }
                if(bje.pidb){
                    pidsFromBJEs.push(bje.pidb);
                }
            });
            pids = _.union(pids, pidsFromBJEs);
        }
        _.stableSortBy(pids, e => e, true);
        theDat = clone(theDat);
        AtomicAct.createNew({
            hid: theNewHid,
            tch: pids.map(e => new ObjectID(e)),
            dat: mongodbUtils.swapKeyDotsToSpecialCrap(clone(theDat)),
            tarcp: `${clientPlatform};${clientVersion}`,
            st: pids.map(() => 0),
            cat: _.now()
        }, callbackFn);
    }
    function doTheAct(){
        let callbackFn = err => callback(err || null);

        doTheActImplementation(theLock, pids, byThePid, newAtomicActFullBody, callbackFn);
    }

    redeemNewHid();
}
function checkAtomicActs(theLock, forPid, callback){
    var forPidObj, soTheActs, theHid, lockedOutside;

    function fetchActs(){
        let callbackFn = (err, docs) => {
            if(err){
                log.error('Mongodb Error', { code: 670, err: { message: err.message, name: err.name } });
                callback(new ErrorResponse(670, 'Database Error'));
            } else if(docs && docs.length){
                soTheActs = docs;
                _.each(soTheActs, d => {
                    d.dat = mongodbUtils.swapSpecialCrapToKeyDots(d.dat);
                    d.tch = d.tch.map(e => e.toString());
                });
                if(theLock){
                    lockedOutside = true;
                    doTheActs();
                } else {
                    getHumanId();
                }
            } else {
                callback(null);
            }
        };

        forPidObj = new ObjectID(forPid);
        AtomicAct.find(
            { tch: forPidObj },
            { projection: { _id: 1, dat: 1, st: 1, tch: 1, tarcp: 1 }, sort: { _id: 1 } }
        ).toArray(callbackFn);
    }
    function getHumanId(){
        let callbackFn = (err, doc) => {
            if(err){
                log.error('Mongodb Error', { code: 725, err: { message: err.message, name: err.name } });
                callback(new ErrorResponse(725, 'Database Error'));
            } else {
                theHid = doc.humanId;
                acquireResourceLock();
            }
        };

        Profile.findOne({ _id: forPidObj }, { projection: { humanId: 1, _id: 0 } }, callbackFn);
    }
    function acquireResourceLock(){
        let callbackFn = (err, _theLock) => {
            if(err){
                callback(err);
            } else {
                theLock = _theLock;
                doTheActs();
            }
        };

        opResourceLocker.getLock(theHid, callbackFn);
    }
    function doTheActs(){
        let callbackFn = err => {
            if(theLock && !lockedOutside){
                returnResourcesLock(err);
            } else if(err){
                callback(err);
            } else {
                callback(null, theHid);
            }
        };

        async.series(soTheActs.map(e => cb => doTheActImplementation(theLock, [forPid], forPid, e, cb)), callbackFn);
    }
    function returnResourcesLock(err){
        opResourceLocker.returnLock(theLock, () => callback(err || null, theHid));
    }

    if(goblinBase.cloudFunctionsConfig){
        fetchActs();
    } else {
        callback(null);
    }
}
function atomicActsLoop(now, callback){
    var fromPage, lockKey, actsCount, thePage,
        tchPids, theHids, theLock;

    function tryToLockRefresh(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 669, err: { code: err.code, command: err.command, message: err.message } });
                callback(new ErrorResponse(669, 'OP Error'));
            } else if(response[0] === 0){
                callback(null);
            } else {
                lockKey = _.isUndefined(response[3]) ? 1 : response[3];
                if(response[2] && response[2] > 0){
                    fromPage = response[1] || 0;
                    actsCount = response[2];
                    nextPage();
                } else {
                    getActsRange();
                }
            }
        };

        opClients.getServiceClient()
            .tryToLockAtomicActsRefresh([now, refreshPackageTimeout, allRefreshTimeout], callbackFn);
    }
    function getActsRange(){
        let callbackFn = (err, responses) => {
            if(err){
                log.error('Mongodb Error', { code: 67, err: { message: err.message, name: err.name } });
                callback(new ErrorResponse(67, 'Database Error'), null);
            } else if(responses.length){
                let hid1 = responses[0] ? responses[0].hid || 0 : 0,
                    hid2 = responses[1] ? responses[1].hid || 0 : 0;
                fromPage = Math.min(hid1, hid2);
                actsCount = Math.max(hid1, hid2);
                nextPage();
            } else {
                callback(null, false);
            }
        };

        async.parallel([
            cb => AtomicAct.findOne({ cat: { $lte: now - 1000 * 60 } }, { sort: { _id: 1 }, projection: { hid: 1 } }, cb),
            cb => AtomicAct.findOne({ cat: { $lte: now - 1000 * 60 } }, { sort: { _id: -1 }, projection: { hid: 1 } }, cb)
        ], callbackFn);
    }
    function nextPage(){
        let callbackFn = (err, docs) => {
            if(err){
                log.error('Mongodb Error', { code: 667, err: { message: err.message, name: err.name } });
                callback(new ErrorResponse(667, 'Database Error'));
            } else {
                thePage = docs;
                if(!docs.length){
                    fromPage += theLimit;
                } else {
                    tchPids = [];
                    _.each(thePage, d => {
                        d.dat = mongodbUtils.swapSpecialCrapToKeyDots(d.dat);
                        tchPids = tchPids.concat(d.tch);
                        d.tch = d.tch.map(e => e.toString());
                    });
                    fromPage = parseInt(_.last(docs).hid);
                }
                getHumanIds();
            }
        };

        var theLimit = Math.min(batchSize, actsCount - fromPage + 1);
        AtomicAct.find(
            { hid: { $gte: fromPage, $lt: fromPage + theLimit }},
            { projection: { _id: 1, dat: 1, st: 1, tch: 1, tarcp: 1, hid: 1 }, sort: { _id: 1 } }
        ).toArray(callbackFn);
    }
    function getHumanIds(){
        let callbackFn = (err, docs) => {
            if(err){
                log.error('Mongodb Error', { code: 726, err: { message: err.message, name: err.name } });
                callback(new ErrorResponse(726, 'Database Error'));
            } else {
                theHids = docs.map(e => e.humanId);
                acquireResourcesLock();
            }
        };

        Profile.find({ _id: { $in: _.uniq(tchPids) } }, { projection: { humanId: 1 } }, callbackFn);
    }
    function acquireResourcesLock(){
        let callbackFn = (err, _theLock) => {
            if(err){
                callback(err);
            } else {
                theLock = _theLock;
                doThePage();
            }
        };

        opResourceLocker.getLock(theHids, callbackFn);
    }
    function doThePage(){
        let callbackFn = err => {
            if(err){
                returnResourcesLock(err);
            } else {
                switch(thePage.length){
                    case 0: log.info('Do atomic... DID 0'); break;
                    case 1: log.info(`Do atomic... DID ONLY ${thePage[0].hid}`); break;
                    default: log.info(`Do atomic... DID FROM ${_.first(thePage).hid} TO ${_.last(thePage).hid}`);
                }
                unlockRefresh();
            }
        };

        var asyncJobs = [];
        _.each(thePage, doc => asyncJobs.push(cb => doTheActImplementation(theLock, doc.tch, undefined, doc, cb)));
        async.series(asyncJobs, callbackFn);
    }
    function unlockRefresh(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 666, err: { code: err.code, command: err.command, message: err.message } });
                returnResourcesLock(new ErrorResponse(666, 'OP Error'));
            } else {
                returnResourcesLock();
            }
        };

        opClients.getServiceClient().unlockAtomicActsRefresh([fromPage, lockKey, now], callbackFn);
    }
    function returnResourcesLock(err){
        opResourceLocker.returnLock(theLock, () => callback(err || null));
    }

    if(goblinBase.cloudFunctionsConfig && now > atomicActsLoopLazyTimeout){
        atomicActsLoopLazyTimeout = now + refreshPackageTimeout;
        tryToLockRefresh();
    } else {
        callback(null);
    }
}
function doTheActImplementation(theLock, targetPids, doNotMutatePid, actFullBody, callback){
    var curTargetPid, clientPlatform, clientVersion;

    var curTargetPidIx, curTargetPidTch, changedStates = cloneDeep(actFullBody.st);

    function rollUpProfileSets(){
        function prepare(){
            if(actFullBody.dat.prf){
                curTargetPidIx = 0;
                pickAppropriatePid();
            } else {
                for(let i = 0 ; i < targetPids.length ; i++){
                    let _tch = actFullBody.tch.indexOf(targetPids[i]);
                    if(_tch >= 0 && changedStates[_tch] === PROFILE_STATE){
                        changedStates[_tch]++;
                    }
                }
                rollUpRecordsSets();
            }
        }
        function pickAppropriatePid(){
            curTargetPid = undefined;
            curTargetPidTch = undefined;
            if(curTargetPidIx < targetPids.length){
                for(let i = curTargetPidIx ; i < targetPids.length ; i++){
                    let _tch = actFullBody.tch.indexOf(targetPids[i]);
                    if(_tch >= 0 && changedStates[_tch] === PROFILE_STATE){
                        curTargetPid = actFullBody.tch[_tch];
                        if(actFullBody.dat.prf[curTargetPid]){
                            curTargetPidTch = _tch;
                            curTargetPidIx = i + 1;
                            break;
                        } else {
                            curTargetPid = undefined;
                            changedStates[_tch]++;
                        }
                    }
                }
            }
            if(curTargetPid){
                tryToMutateProfile();
            } else {
                rollUpRecordsSets();
            }
        }
        function tryToMutateProfile(){
            if((!clientPlatform || !clientVersion) && actFullBody.tarcp){
                [clientPlatform, clientVersion] = actFullBody.tarcp.split(';');
            }
            if(curTargetPid !== doNotMutatePid && clientPlatform && clientVersion && theLock){
                let callbackFn = (response, code) => {
                    if(code !== 200){
                        callback(new ErrorResponseWithCode(response.index, response.message, code));
                    } else {
                        doPersist();
                    }
                };

                profiles.tryToMutateProfileImplementation(
                    theLock, curTargetPid, actFullBody.dat.prf[curTargetPid].hid,
                    clientPlatform, clientVersion, _.now(),
                    callbackFn
                );
            } else {
                doPersist();
            }
        }
        function doPersist(){
            let callbackFn = err => {
                if(global.M8x8CUgY){    // Error emitter for test case "atomicsAreGoodAtFailures-contract.js"
                    return callback(new ErrorResponse(9999, 'M8x8CUgY'));
                }
                if(err){
                    log.error('Mongodb Error', { code: 727, err: { message: err.message, name: err.name } });
                    callback(new ErrorResponse(727, 'Database Error'));
                } else {
                    changedStates[curTargetPidTch]++;
                    pickAppropriatePid();
                }
            };

            var theSet = {},
                tar = actFullBody.dat.prf[curTargetPid].v;
            _.each(tar, (v, k) => {
                if(v == null){
                    if(!theSet.$unset){
                        theSet.$unset = {};
                    }
                    theSet.$unset[k] = 1;
                } else {
                    if(!theSet.$set){
                        theSet.$set = {};
                    }
                    theSet.$set[k] = v;
                }
            });
            Profile.findOneAndUpdate({ _id: new ObjectID(curTargetPid) }, theSet, callbackFn);
        }

        prepare();
    }
    function rollUpRecordsSets(){
        var doUpdateStatus = true, hasSpans = false,
            curRec, getTheHumanIds, soHumanIdsStartsFrom,
            thisPlayerVk, thisPlayerOk, thisPlayerFb;

        function prepare(){
            if(actFullBody.dat.rec){
                curTargetPidIx = 0;
                pickAppropriatePid();
            } else {
                for(let i = 0 ; i < targetPids.length ; i++){
                    let _tch = actFullBody.tch.indexOf(targetPids[i]);
                    if(_tch >= 0 && changedStates[_tch] === RECORDS_STATE){
                        changedStates[_tch]++;
                    }
                }
                rollUpReceipts();
            }
        }
        function pickAppropriatePid(){
            curTargetPid = undefined;
            curTargetPidTch = undefined;
            if(curTargetPidIx < targetPids.length){
                for(let i = curTargetPidIx ; i < targetPids.length ; i++){
                    let _tch = actFullBody.tch.indexOf(targetPids[i]);
                    if(_tch >= 0 && changedStates[_tch] === RECORDS_STATE){
                        curTargetPid = actFullBody.tch[_tch];
                        if(actFullBody.dat.rec[curTargetPid]){
                            curTargetPidTch = _tch;
                            curTargetPidIx = i + 1;
                            break;
                        } else {
                            curTargetPid = undefined;
                            hasSpans = true;
                        }
                    }
                }
            }
            if(curTargetPid){
                if(doUpdateStatus){
                    doUpdateStatus = false;
                    updateStatus();
                } else {
                    checkRecordsInDb();
                }
            } else {
                doSpan(true);
            }
        }
        function updateStatus(){
            var theUpdates;
            for(let i = 0 ; i < changedStates.length ; i++){
                if(changedStates[i] !== actFullBody.st[i]){
                    if(!theUpdates){
                        theUpdates = [];
                    }
                    theUpdates.push(i);
                }
            }
            if(theUpdates){
                let callbackFn = err => {
                    if(global.fV36sWdU){    // Error emitter for test case "atomicsAreGoodAtFailures-contract.js"
                        return callback(new ErrorResponse(9999, 'fV36sWdU'));
                    }
                    if(err){
                        log.error('Mongodb Error', { code: 728, err: { message: err.message, name: err.name } });
                        callback(new ErrorResponse(728, 'Database Error'));
                    } else {
                        doSpan();
                    }
                };

                let theSet = {};
                for(let i = 0 ; i < theUpdates.length ; i++){
                    let _updIx = theUpdates[i];
                    theSet[`st.${_updIx}`] = actFullBody.st[_updIx] = changedStates[_updIx];
                }
                AtomicAct.findOneAndUpdate({ _id: actFullBody._id }, { $set: theSet }, callbackFn);
            } else {
                doSpan();
            }
        }
        function doSpan(danone){
            if(hasSpans){
                for(let i = 0 ; i < targetPids.length ; i++){
                    let _tch = actFullBody.tch.indexOf(targetPids[i]);
                    if(_tch >= 0 && changedStates[_tch] === RECORDS_STATE && !actFullBody.dat.rec[actFullBody.tch[_tch]]){
                        changedStates[_tch]++;
                    }
                }
            }
            if(danone){
                rollUpReceipts();
            } else {
                checkRecordsInDb();
            }
        }
        function checkRecordsInDb(){
            let callbackFn = (err, docs) => {
                if(global.UTgyacGT){    // Error emitter for test case "atomicsAreGoodAtFailures-contract.js"
                    return callback(new ErrorResponse(9999, 'UTgyacGT'));
                }
                if(err){
                    log.error('Mongodb Error', { code: 729, err: { message: err.message, name: err.name } });
                    callback(new ErrorResponse(729, 'Database Error'));
                } else {
                    _.each(curRec, (v, k) => {
                        var theDoc = docs.find(e => e.segm === k);
                        if(theDoc){
                            if(v === theDoc.val){
                                delete curRec[k];
                            } else {
                                if(v < 0){
                                    theDoc.remove = true;
                                }
                                theDoc.val = v;
                                curRec[k] = theDoc;
                            }
                        } else if(v < 0){
                            delete curRec[k];
                        } else {
                            getTheHumanIds++;
                            curRec[k] = { segm: k, val: v };
                        }
                    });
                    if(_.size(curRec)){
                        tryToGetHumanIdsForRecords();
                    } else {
                        changedStates[curTargetPidTch]++;
                        pickAppropriatePid();
                    }
                }
            };

            curRec = actFullBody.dat.rec[curTargetPid].v;
            var theOr = [];
            getTheHumanIds = 0;
            _.each(curRec, (v, k) => theOr.push({ pid: new ObjectID(curTargetPid), segm: k }));
            Record.find({ $or: theOr }, { projection: { _id: 1, segm: 1, val: 1 } }).toArray(callbackFn);
        }
        function tryToGetHumanIdsForRecords(){
            if(getTheHumanIds){
                let callbackFn = (err, val) => {
                    if(global.K6RYs9tS){    // Error emitter for test case "atomicsAreGoodAtFailures-contract.js"
                        return callback(new ErrorResponse(9999, 'K6RYs9tS'));
                    }
                    if(err){
                        callback(err);
                    } else {
                        soHumanIdsStartsFrom = val - getTheHumanIds + 1;
                        doPersist();
                    }
                };

                getNextSequenceValueForRecord(getTheHumanIds, callbackFn);
            } else {
                doPersist();
            }
        }
        function doPersist(){
            let callbackFn = err => {
                if(global.GZA9FcbS){    // Error emitter for test case "atomicsAreGoodAtFailures-contract.js"
                    return callback(new ErrorResponse(9999, 'GZA9FcbS'));
                }
                if(err){
                    log.error('Mongodb Error', { code: 730, err: { message: err.message, name: err.name } });
                    callback(new ErrorResponse(730, 'Database Error'));
                } else {
                    getSomeAuxDataForThatPlayer();
                }
            };

            var theBulk = [];
            _.each(curRec, v => {
                if(v.remove){
                    theBulk.push({ deleteOne: { filter: { _id: v._id } } })
                } else if(_.isUndefined(v._id)){
                    theBulk.push({
                        updateOne: {
                            filter: { pid: new ObjectID(curTargetPid), segm: v.segm },
                            update: { $setOnInsert: { hid: soHumanIdsStartsFrom++, val: v.val } },
                            upsert: true
                        }
                    });
                } else {
                    theBulk.push({ updateOne: { filter: { _id: v._id }, update: { $set: { val: v.val } } } });
                }
            });
            Record.bulkWrite(theBulk, { ordered: false, w: 1 }, callbackFn);
        }
        function getSomeAuxDataForThatPlayer(){
            let callbackFn = (err, doc) => {
                if(err){
                    log.error('Mongodb Error', { code: 731, err: { message: err.message, name: err.name } });
                    changedStates[curTargetPidTch]++;
                    pickAppropriatePid();
                } else {
                    thisPlayerVk = doc.vk;
                    thisPlayerOk = doc.ok;
                    thisPlayerFb = doc.fb;
                    pushRecordsToOP();
                }
            };

            Profile.findOne(
                { _id: new ObjectID(curTargetPid) },
                { projection: { vk: 1, ok: 1, fb: 1, _id: 0 } },
                callbackFn
            );
        }
        function pushRecordsToOP(){
            let callbackFn = err => {
                if(err){
                    log.error('OP Error', { code: 732, err: { code: err.code, command: err.command, message: err.message } });
                }
                changedStates[curTargetPidTch]++;
                pickAppropriatePid();
            };

            var thePushNodes = {},
                asyncJobs = [];

            _.each(curRec, (v, k) => {
                if(!_.isObject(v)){
                    v = { segm: k, val: v };
                }
                if(v.remove){
                    asyncJobs.push(cb =>
                        opClients.getRecordsClient().removeRecord([
                            curTargetPid, v.segm,
                            thisPlayerVk || '', thisPlayerOk || '',
                            thisPlayerFb || ''
                        ], cb));
                } else {
                    thePushNodes[v.segm] = v.val;
                }
            });
            if(_.size(thePushNodes)){
                let args = [
                    curTargetPid,
                    thisPlayerVk || -1,
                    thisPlayerFb || -1,
                    thisPlayerOk || -1,
                    goblinBase.leaderboardsConfig.numericConstants.operativeRecordLifetime || 0
                ];
                _.each(thePushNodes, (v, k) => args.push(k, v));
                if(args.length > 5){
                    asyncJobs.push(cb => opClients.getRecordsClient().postManyRecords(args, cb));
                }
            }
            if(asyncJobs.length){
                async.series(asyncJobs, callbackFn);
            } else {
                changedStates[curTargetPidTch]++;
                pickAppropriatePid();
            }
        }

        prepare();
    }
    function rollUpReceipts(){
        var doUpdateStatus = true, hasSpans = false;

        function prepare(){
            if(actFullBody.dat.rcp){
                curTargetPidIx = 0;
                pickAppropriatePid();
            } else {
                for(let i = 0 ; i < targetPids.length ; i++){
                    let _tch = actFullBody.tch.indexOf(targetPids[i]);
                    if(_tch >= 0 && changedStates[_tch] === RECEIPTS_STATE){
                        changedStates[_tch]++;
                    }
                }
                rollUpBattleJournalEntries();
            }
        }
        function pickAppropriatePid(){
            curTargetPid = undefined;
            curTargetPidTch = undefined;
            if(curTargetPidIx < targetPids.length){
                for(let i = curTargetPidIx ; i < targetPids.length ; i++){
                    let _tch = actFullBody.tch.indexOf(targetPids[i]);
                    if(_tch >= 0 && changedStates[_tch] === RECEIPTS_STATE){
                        curTargetPid = actFullBody.tch[_tch];
                        if(!!actFullBody.dat.rcp.find(e => e.pid === curTargetPid)){
                            curTargetPidTch = _tch;
                            curTargetPidIx = i + 1;
                            break;
                        } else {
                            curTargetPid = undefined;
                            hasSpans = true;
                        }
                    }
                }
            }
            if(curTargetPid){
                if(doUpdateStatus){
                    doUpdateStatus = false;
                    updateStatus();
                } else {
                    doPersist();
                }
            } else {
                doSpan(true);
            }
        }
        function updateStatus(){
            var theUpdates;
            for(let i = 0 ; i < changedStates.length ; i++){
                if(changedStates[i] !== actFullBody.st[i]){
                    if(!theUpdates){
                        theUpdates = [];
                    }
                    theUpdates.push(i);
                }
            }
            if(theUpdates){
                let callbackFn = err => {
                    if(global.GXJ2vPMm){    // Error emitter for test case "atomicsAreGoodAtFailures-contract.js"
                        return callback(new ErrorResponse(9999, 'GXJ2vPMm'));
                    }
                    if(err){
                        log.error('Mongodb Error', { code: 733, err: { message: err.message, name: err.name } });
                        callback(new ErrorResponse(733, 'Database Error'));
                    } else {
                        doSpan();
                    }
                };

                let theSet = {};
                for(let i = 0 ; i < theUpdates.length ; i++){
                    let _updIx = theUpdates[i];
                    theSet[`st.${_updIx}`] = actFullBody.st[_updIx] = changedStates[_updIx];
                }
                AtomicAct.findOneAndUpdate({ _id: actFullBody._id }, { $set: theSet }, callbackFn);
            } else {
                doSpan();
            }
        }
        function doSpan(danone){
            if(hasSpans){
                for(let i = 0 ; i < targetPids.length ; i++){
                    let _tch = actFullBody.tch.indexOf(targetPids[i]);
                    if(_tch >= 0 && changedStates[_tch] === RECEIPTS_STATE && !actFullBody.dat.rcp.find(e => e.pid === actFullBody.tch[_tch])){
                        changedStates[_tch]++;
                    }
                }
            }
            if(danone){
                rollUpBattleJournalEntries();
            } else {
                doPersist();
            }
        }
        function doPersist(){
            let callbackFn = err => {
                if(global.qgy2dggs){    // Error emitter for test case "atomicsAreGoodAtFailures-contract.js"
                    return callback(new ErrorResponse(9999, 'qgy2dggs'));
                }
                if(global.bc3RdqxT){    // Секция, которая имитирует ошибку для теста atomicsAreGoodAtFailures2-contract.js
                    return callback(new ErrorResponse(9999, 'bc3RdqxT'));
                }
                if(err){
                    log.error('Mongodb Error', { code: 734, err: { message: err.message, name: err.name } });
                    callback(new ErrorResponse(734, 'Database Error'));
                } else {
                    changedStates[curTargetPidTch]++;
                    pickAppropriatePid();
                }
            };
            let duplicateCallbackFn = cb => err => {
                if(!err || (err && err.code === 11000 && err.message.startsWith(DUPLICATE_KEY_ERROR))){
                    cb(null);
                } else {
                    cb(err)
                }
            };

            var targetPidReceipts = actFullBody.dat.rcp.filter(e => e.pid === curTargetPid);
            if(targetPidReceipts.length === 1 || global.bc3RdqxT){
                targetPidReceipts[0].pid = new ObjectID(targetPidReceipts[0].pid);
                Receipt.createNew(targetPidReceipts[0], duplicateCallbackFn(callbackFn));
            } else {
                let asyncJobs = targetPidReceipts.map(e => cb => {
                    e.pid = new ObjectID(e.pid);
                    Receipt.createNew(e, duplicateCallbackFn(cb))
                });
                async.series(asyncJobs, callbackFn);
            }
        }

        prepare();
    }
    function rollUpBattleJournalEntries(){
        var doUpdateStatus = true, hasSpans = false,
            targetPveBattles, targetPvpBattles,
            pveHidStartsFrom, pvpHidStartsFrom;

        function prepare(){
            if(actFullBody.dat.bje){
                curTargetPidIx = 0;
                pickAppropriatePid();
            } else {
                for(let i = 0 ; i < targetPids.length ; i++){
                    let _tch = actFullBody.tch.indexOf(targetPids[i]);
                    if(_tch >= 0 && changedStates[_tch] === BJE_STATE){
                        changedStates[_tch]++;
                    }
                }
                tryToDoneAct();
            }
        }
        function pickAppropriatePid(){
            curTargetPid = undefined;
            curTargetPidTch = undefined;
            if(curTargetPidIx < targetPids.length){
                for(let i = curTargetPidIx ; i < targetPids.length ; i++){
                    let _tch = actFullBody.tch.indexOf(targetPids[i]);
                    if(_tch >= 0 && changedStates[_tch] === BJE_STATE){
                        curTargetPid = actFullBody.tch[_tch];
                        if(!!actFullBody.dat.bje.find(e => e.pid === curTargetPid || e.pida === curTargetPid || e.pidb === curTargetPid)){
                            curTargetPidTch = _tch;
                            curTargetPidIx = i + 1;
                            break;
                        } else {
                            curTargetPid = undefined;
                            hasSpans = true;
                        }
                    }
                }
            }
            if(curTargetPid){
                if(doUpdateStatus){
                    doUpdateStatus = false;
                    updateStatus();
                } else {
                    tryToGetHumanIdsForPve();
                }
            } else {
                doSpan(true);
            }
        }
        function updateStatus(){
            var theUpdates;
            for(let i = 0 ; i < changedStates.length ; i++){
                if(changedStates[i] !== actFullBody.st[i]){
                    if(!theUpdates){
                        theUpdates = [];
                    }
                    theUpdates.push(i);
                }
            }
            if(theUpdates){
                let callbackFn = err => {
                    if(global.brjBQgdR){    // Error emitter for test case "atomicsAreGoodAtFailures-contract.js"
                        return callback(new ErrorResponse(9999, 'brjBQgdR'));
                    }
                    if(err){
                        log.error('Mongodb Error', { code: 735, err: { message: err.message, name: err.name } });
                        callback(new ErrorResponse(735, 'Database Error'));
                    } else {
                        doSpan();
                    }
                };

                let theSet = {};
                for(let i = 0 ; i < theUpdates.length ; i++){
                    let _updIx = theUpdates[i];
                    theSet[`st.${_updIx}`] = actFullBody.st[_updIx] = changedStates[_updIx];
                }
                AtomicAct.findOneAndUpdate({ _id: actFullBody._id }, { $set: theSet }, callbackFn);
            } else {
                doSpan();
            }
        }
        function doSpan(danone){
            if(hasSpans){
                for(let i = 0 ; i < targetPids.length ; i++){
                    let _tch = actFullBody.tch.indexOf(targetPids[i]);
                    if(_tch >= 0 && changedStates[_tch] === BJE_STATE && !actFullBody.dat.bje.find(e => e.pid === actFullBody.tch[_tch] || e.pida === actFullBody.tch[_tch] || e.pidb === actFullBody.tch[_tch])){
                        changedStates[_tch]++;
                    }
                }
            }
            if(danone){
                tryToDoneAct();
            } else {
                tryToGetHumanIdsForPve();
            }
        }
        function tryToGetHumanIdsForPve(){
            targetPveBattles = actFullBody.dat.bje.filter(e => e.pid === curTargetPid);
            if(targetPveBattles.length){
                let callbackFn = (err, val) => {
                    if(global.FtFMwUuS){    // Error emitter for test case "atomicsAreGoodAtFailures-contract.js"
                        return callback(new ErrorResponse(9999, 'FtFMwUuS'));
                    }
                    if(err){
                        callback(err);
                    } else {
                        pveHidStartsFrom = val - targetPveBattles.length + 1;
                        tryToGetHumanIdsForPvp();
                    }
                };

                getNextSequenceValueForPveBattle(targetPveBattles.length, callbackFn);
            } else {
                tryToGetHumanIdsForPvp();
            }
        }
        function tryToGetHumanIdsForPvp(){
            targetPvpBattles = actFullBody.dat.bje.filter(e => e.pida === curTargetPid || e.pidb === curTargetPid);
            if(targetPvpBattles.length){
                let callbackFn = (err, val) => {
                    if(global.hCkmPUTV){    // Error emitter for test case "atomicsAreGoodAtFailures-contract.js"
                        return callback(new ErrorResponse(9999, 'hCkmPUTV'));
                    }
                    if(err){
                        callback(err);
                    } else {
                        pvpHidStartsFrom = val - targetPvpBattles.length + 1;
                        tryToPersistPveBattles();
                    }
                };

                getNextSequenceValueForPvpBattle(targetPvpBattles.length, callbackFn);
            } else {
                tryToPersistPveBattles();
            }
        }
        function tryToPersistPveBattles(){
            if(targetPveBattles.length && pveHidStartsFrom){
                let callbackFn = err => {
                    if(global.abAxXWDG){    // Секция, которая имитирует ошибку для теста atomicsAreGoodAtFailures2-contract.js
                        return callback(new ErrorResponse(9999, 'abAxXWDG'));
                    }
                    if(global.XJPQYMEN){    // Секция, которая имитирует ошибку для теста atomicsAreGoodAtFailures2-contract.js
                        return callback(new ErrorResponse(9999, 'XJPQYMEN'));
                    }
                    if(err){
                        log.error('Mongodb Error', { code: 700, err: { message: err.message, name: err.name } });
                        callback(new ErrorResponse(700, 'Database Error'));
                    } else {
                        tryToPersistPvpBattles();
                    }
                };
                let duplicateCallbackFn = cb => err => {
                    if(!err || (err && err.code === 11000 && err.message.startsWith(DUPLICATE_KEY_ERROR))){
                        cb(null);
                    } else {
                        cb(err)
                    }
                };

                if(targetPveBattles.length === 1 || global.XJPQYMEN){   // имитирует ошибку для теста atomicsAreGoodAtFailures2-contract.js
                    targetPveBattles[0].hid = pveHidStartsFrom++;
                    targetPveBattles[0].pid = new ObjectID(targetPveBattles[0].pid);
                    PveBattleModel.createNew(targetPveBattles[0], duplicateCallbackFn(callbackFn));
                } else {
                    let asyncJobs = targetPveBattles.map(e => cb => {
                        e.hid = pveHidStartsFrom++;
                        e.pid = new ObjectID(e.pid);
                        PveBattleModel.createNew(e, duplicateCallbackFn(cb))
                    });
                    async.series(asyncJobs, callbackFn);
                }
            } else {
                tryToPersistPvpBattles();
            }
        }
        function tryToPersistPvpBattles(){
            if(targetPvpBattles.length && pvpHidStartsFrom){
                let callbackFn = err => {
                    if(global.nkZv3JjM){ // Секция, которая имитирует ошибку для теста atomicsAreGoodAtFailures2-contract.js
                        return callback(new ErrorResponse(9999, 'nkZv3JjM'));
                    }
                    if(err){
                        log.error('Mongodb Error', { code: 701, err: { message: err.message, name: err.name } });
                        callback(new ErrorResponse(701, 'Database Error'));
                    } else {
                        changedStates[curTargetPidTch]++;
                        pickAppropriatePid();
                    }
                };
                let duplicateCallbackFn = cb => err => {
                    if(!err || (err && err.code === 11000 && err.message.startsWith(DUPLICATE_KEY_ERROR))){
                        cb(null);
                    } else {
                        cb(err)
                    }
                };

                if(targetPvpBattles.length === 1){
                    targetPvpBattles[0].hid = pvpHidStartsFrom++;
                    targetPvpBattles[0].pida = new ObjectID(targetPvpBattles[0].pida);
                    targetPvpBattles[0].pidb = new ObjectID(targetPvpBattles[0].pidb);
                    PvpBattleModel.createNew(targetPvpBattles[0], duplicateCallbackFn(callbackFn));
                } else {
                    let asyncJobs = targetPvpBattles.map(e => cb => {
                        e.hid = pvpHidStartsFrom++;
                        e.pida = new ObjectID(e.pida);
                        e.pidb = new ObjectID(e.pidb);
                        PvpBattleModel.createNew(e, duplicateCallbackFn(cb))
                    });
                    async.series(asyncJobs, callbackFn);
                }
            } else {
                changedStates[curTargetPidTch]++;
                pickAppropriatePid();
            }
        }

        prepare();
    }
    function tryToDoneAct(){
        function determine(){
            if(changedStates.every(e => e === DONE_STATE)){
                fullyDeleteAct();
            } else {
                justUpdateStates();
            }
        }
        function justUpdateStates(){
            var theUpdates;
            for(let i = 0 ; i < changedStates.length ; i++){
                if(changedStates[i] !== actFullBody.st[i]){
                    if(!theUpdates){
                        theUpdates = [];
                    }
                    theUpdates.push(i);
                }
            }
            if(theUpdates){
                let callbackFn = err => {
                    if(global.VDGSMrqs){    // Error emitter for test case "atomicsAreGoodAtFailures-contract.js"
                        return callback(new ErrorResponse(9999, 'VDGSMrqs'));
                    }
                    if(err){
                        log.error('Mongodb Error', { code: 702, err: { message: err.message, name: err.name } });
                        callback(new ErrorResponse(702, 'Database Error'));
                    } else {
                        callback(null);
                    }
                };

                let theSet = {};
                for(let i = 0 ; i < theUpdates.length ; i++){
                    let _updIx = theUpdates[i];
                    theSet[`st.${_updIx}`] = actFullBody.st[_updIx] = changedStates[_updIx];
                }
                AtomicAct.findOneAndUpdate({ _id: actFullBody._id }, { $set: theSet }, callbackFn);
            } else {
                callback(null);
            }
        }
        function fullyDeleteAct(){
            let callbackFn = err => {
                if(global.znMdj4Hb){    // Error emitter for test case "atomicsAreGoodAtFailures-contract.js"
                    return callback(new ErrorResponse(9999, 'znMdj4Hb'));
                }
                if(err){
                    log.error('Mongodb Error', { code: 703, err: { message: err.message, name: err.name } });
                    callback(new ErrorResponse(703, 'Database Error'));
                } else {
                    callback(null);
                }
            };

            AtomicAct.findOneAndDelete({ _id: actFullBody._id }, callbackFn);
        }

        determine();
    }

    rollUpProfileSets();
}

function getNextSequenceValueForAtomicAct(callback){
    const SEQUENCE_NAME = 'atomicAct';

    SequentialCounter.getNextSequenceValue(SEQUENCE_NAME, 1, callback);
}
function getNextSequenceValueForRecord(howMuch, callback){
    const SEQUENCE_NAME = 'recordHumanId';

    SequentialCounter.getNextSequenceValue(SEQUENCE_NAME, howMuch, callback);
}
function getNextSequenceValueForPveBattle(howMuch, callback){
    const SEQUENCE_NAME = 'pveBattleHid';

    SequentialCounter.getNextSequenceValue(SEQUENCE_NAME, howMuch, callback);
}
function getNextSequenceValueForPvpBattle(howMuch, callback){
    const SEQUENCE_NAME = 'battleHumanId';

    SequentialCounter.getNextSequenceValue(SEQUENCE_NAME, howMuch, callback);
}