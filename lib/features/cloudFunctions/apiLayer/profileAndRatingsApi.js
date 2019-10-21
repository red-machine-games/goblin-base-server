'use strict';

const NEW_PROFILE_NODES_CAN_BEGIN_ONLY_FROM = ['profileData', 'publicProfileData'];

module.exports = {
    getProfileNode,
    getProfileNodeWithHid,
    getPublicProfileNode,
    getPublicProfileNodeWithHid,
    makeNewNode,
    checkIsBot,

    tryToPersistOnlyProfileNodes,
    tryToPersistOnlyOneRecord,
    tryToPersistProfileNodesAtomicAct,

    getSelfRatingNode,
    addTheRatingNode,
    getSomeonesRatingNode,
    listAllRatings,

    NEW_PROFILE_NODES_CAN_BEGIN_ONLY_FROM
};

const goblinBase = require('../../../../index.js').getGoblinBase(),
    log = goblinBase.logsHook;

var _ = require('lodash'),
    objPath = require('object-path'),
    cloneDeep = require('clone-deep'),
    ObjectID = require('mongodb').ObjectID;

var atomicActs = require('../../atomic/atomicActs.js'),
    profiles = require('../../accountsAndProfiles/profiles.js'),
    records = require('../../leaderboards/leaderboards.js');

const REGEXP_ONLY_LETTERS_AND_DOT = /[A-Za-z0-9.]/,
    READ_ONLY_NODES = ['humanId', 'vk', 'fb', 'ok'],
    SPECIAL_NUMERIC_PATHS = require('../../accountsAndProfiles/profiles.js').PROFILE_MODIFY_RESERVED_NODES_SECONDARY,
    PROFILE_PUBLIC_DATA_ROOT = 'publicProfileData',
    PROFILE_MODIFY_RESERVED_NODES_PRIMARY = _.difference(
        require('../../accountsAndProfiles/profiles.js').PROFILE_MODIFY_RESERVED_NODES_PRIMARY,
        READ_ONLY_NODES
    );

var Profile = require('../../../persistenceSubsystem/dao/profile.js'),
    Record = require('../../../persistenceSubsystem/dao/record.js');

var ProfileNode = require('../CF_Classes.js').ProfileNode,
    PublicProfileNode = require('../CF_Classes.js').PublicProfileNode,
    RatingNode = require('../CF_Classes.js').RatingNode;

var ErrorResponse = require('../../../objects/ErrorResponse.js'),
    ErrorResponseWithCode = require('../../../objects/ErrorResponseWithCode.js');

async function getProfileNodeWithHid(theLock, hid, nodePath, arrSkip, arrLimit, fakeProfileAccess,
                                     clientPlatform, clientVersion){
    var resolve, reject,
        thePid;

    function getPidFromHid(){
        let callbackFn = (err, doc) => {
            if(err){
                log.error('Mongodb Error', { code: 357, err: { message: err.message, name: err.name } });
                reject(new ErrorResponse(357, 'Database Error'));
            } else if(doc){
                thePid = doc._id.toString();
                checkForAtomicActs();
            } else {
                resolve(null);
            }
        };

        Profile.findOne({ humanId: hid }, { projection: { _id: 1 } }, callbackFn);
    }
    function checkForAtomicActs(){
        let callbackFn = err => {
            if(err){
                reject(err);
            } else {
                tryToMutateProfile();
            }
        };

        atomicActs.checkAtomicActs(theLock, thePid, callbackFn);
    }
    function tryToMutateProfile(){
        let callbackFn = (response, code) => {
            if(code !== 200){
                reject(new ErrorResponseWithCode(response.index, response.message, code));
            } else {
                resolve(getProfileNode(thePid, nodePath, arrSkip, arrLimit, fakeProfileAccess));
            }
        };

        profiles.tryToMutateProfileImplementation(theLock, thePid, hid, clientPlatform, clientVersion, _.now(), callbackFn);
    }
    return new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
        getPidFromHid();
    });
}

async function getProfileNode(pid, nodePath, arrSkip, arrLimit, fakeProfileAccess){
    var resolve, reject,
        theValue, targetHumanId;

    function checkInput(){
        if(!nodePath || !REGEXP_ONLY_LETTERS_AND_DOT.test(nodePath) || !checkPath(nodePath)){
            reject(new ErrorResponse(791, 'Invalid profile node path'));
        } else {
            for(let i = 0 ; i < PROFILE_MODIFY_RESERVED_NODES_PRIMARY.length ; i++){
                let prn = PROFILE_MODIFY_RESERVED_NODES_PRIMARY[i];
                if(nodePath.startsWith(prn)){
                    reject(new ErrorResponse(792, `Used primary reserved name: ${prn}`));
                }
            }
            doFetch();
        }
    }
    function doFetch(){
        if(!fakeProfileAccess){
            let callbackFn = (err, doc) => {
                if(err){
                    log.error('Mongodb Error', { code: 793, err: { message: err.message, name: err.name } });
                    reject(new ErrorResponse(793, 'Database Error'));
                } else if(doc){
                    theValue = objPath.get(doc, nodePath);
                    targetHumanId = doc.humanId;
                    formNodeAndReturn();
                } else {
                    resolve(null);
                }
            };

            let select = { _id: 0, humanId: 1 },
                doSkip = _.isNumber(arrSkip), doLimit = _.isNumber(arrLimit);
            if(doSkip || doLimit){
                if(doLimit && !doSkip){
                    select[nodePath] = { $slice: arrLimit };
                } else if(!doLimit && doSkip){
                    select[nodePath] = { $slice: [arrSkip, Number.MAX_VALUE] };
                } else {
                    select[nodePath] = { $slice: [arrSkip, arrLimit] };
                }
            } else {
                select[nodePath] = 1;
            }
            Profile.findOne({ _id: new ObjectID(pid) }, { projection: select }, callbackFn);
        } else {
            theValue = _.fakeObjectOrReal(_.random(9999));
            formNodeAndReturn();
        }
    }
    function formNodeAndReturn(){
        if(_.isUndefined(theValue)){
            theValue = null;
        }
        resolve(new ProfileNode(nodePath, theValue, targetHumanId, pid, true, fakeProfileAccess));
    }

    return new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
        checkInput();
    });
}
async function getPublicProfileNodeWithHid(theLock, hid, nodePath, arrSkip, arrLimit, fakeProfileAccess,
                                           clientPlatform, clientVersion){
    var resolve, reject,
        thePid;

    function getPidFromHid(){
        let callbackFn = (err, doc) => {
            if(err){
                log.error('Mongodb Error', { code: 681, err: { message: err.message, name: err.name } });
                reject(new ErrorResponse(681, 'Database Error'));
            } else if(doc){
                thePid = doc._id.toString();
                checkForAtomicActs();
            } else {
                resolve(null);
            }
        };

        Profile.findOne({ humanId: hid }, { projection: { _id: 1 } }, callbackFn);
    }
    function checkForAtomicActs(){
        let callbackFn = err => {
            if(err){
                reject(err);
            } else {
                tryToMutateProfile();
            }
        };

        atomicActs.checkAtomicActs(theLock, thePid, callbackFn);
    }
    function tryToMutateProfile(){
        let callbackFn = (response, code) => {
            if(code !== 200){
                reject(new ErrorResponseWithCode(response.index, response.message, code));
            } else {
                resolve(getPublicProfileNode(thePid, nodePath, arrSkip, arrLimit, fakeProfileAccess));
            }
        };

        profiles.tryToMutateProfileImplementation(theLock, thePid, hid, clientPlatform, clientVersion, _.now(), callbackFn);
    }

    return new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
        getPidFromHid();
    });
}
async function getPublicProfileNode(pid, nodePath, arrSkip, arrLimit, fakeProfileAccess){
    var resolve, reject,
        theValue, targetHumanId;

    function checkInput(){
        if(!nodePath || !REGEXP_ONLY_LETTERS_AND_DOT.test(nodePath) || !checkPath(nodePath)){
            reject(new ErrorResponse(794, 'Invalid profile node path'));
        } else if(!nodePath.startsWith(PROFILE_PUBLIC_DATA_ROOT)){
            reject(new ErrorResponse(795, `Path can only be started from ${PROFILE_PUBLIC_DATA_ROOT}`));
        } else {
            doFetch();
        }
    }
    function doFetch(){
        if(!fakeProfileAccess){
            let callbackFn = (err, doc) => {
                if(err){
                    log.error('Mongodb Error', { code: 796, err: { message: err.message, name: err.name } });
                    reject(new ErrorResponse(796, 'Database Error'));
                } else if(doc){
                    theValue = objPath.get(doc, nodePath);
                    targetHumanId = doc.humanId;
                    formNodeAndReturn();
                } else {
                    resolve(null);
                }
            };

            let select = { _id: 0, humanId: 1 },
                doSkip = _.isNumber(arrSkip), doLimit = _.isNumber(arrLimit);
            if(doSkip || doLimit){
                if(doLimit && !doSkip){
                    select[nodePath] = { $slice: arrLimit };
                } else if(!doLimit && doSkip){
                    select[nodePath] = { $slice: [arrSkip, Number.MAX_VALUE] };
                } else {
                    select[nodePath] = { $slice: [arrSkip, arrLimit] };
                }
            } else {
                select[nodePath] = 1;
            }
            Profile.findOne({ _id: new ObjectID(pid) }, { projection: select }, callbackFn);
        } else {
            theValue = _.fakeObjectOrReal(_.random(9999));
            formNodeAndReturn();
        }
    }
    function formNodeAndReturn(){
        resolve(new PublicProfileNode(targetHumanId, nodePath, theValue));
    }

    return new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
        checkInput();
    });
}
function makeNewNode(hid, pid, nodePath, fakeProfileAccess, isMutation){
    if(!nodePath || !REGEXP_ONLY_LETTERS_AND_DOT.test(nodePath) || !checkPath(nodePath)){
        throw new ErrorResponse(797, 'Invalid profile node path');
    } else {
        if(nodePath === 'ver'){
            if(!isMutation){
                throw new ErrorResponse(682, 'You can change ver only from mutation');
            }
        } else {
            if(!!PROFILE_MODIFY_RESERVED_NODES_PRIMARY.find(e => nodePath.startsWith(e))){
                throw new ErrorResponse(798, `Used primary reserved name for node path`);
            }
            if(!NEW_PROFILE_NODES_CAN_BEGIN_ONLY_FROM.find(e => nodePath.startsWith(`${e}.`) || nodePath === e)){
                throw new ErrorResponse(799, `Invalid root of node path`);
            }
            if(READ_ONLY_NODES.includes(nodePath)){
                throw new ErrorResponse(800, `Node is already exists`);
            }
        }
        return new ProfileNode(nodePath, null, hid, pid, false, fakeProfileAccess);
    }
}
function checkIsBot(targetHumanId){
    var resolve, reject;

    function doCheck(){
        let callbackFn = (err, doc) => {
            if(err){
                log.error('Mongodb Error', { code: 600, err: { message: err.message, name: err.name } });
                reject(new ErrorResponse(600, 'Database Error'));
            } else if(doc){
                resolve(!!doc.isBot);
            } else {
                resolve(null);
            }
        };

        Profile.findOne(
            { humanId: targetHumanId, isDeac: { $exists: false } },
            { projection: { _id: 0, isBot: 1 } },
            callbackFn
        );
    }

    return new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
        doCheck();
    });
}
function tryToPersistOnlyProfileNodes(theLock, byThePid, theProfileNodes, clientPlatform, clientVersion, callback){
    var theSet, targetPid, targetHid;

    function extraValidationProfileNodes(){
        for(let i = 0 ; i < theProfileNodes.length ; i++){
            let node = theProfileNodes[i];
            if(_.includes(SPECIAL_NUMERIC_PATHS, node.path) && (!_.isNumber(node.value) || node.value < 0)){
                return callback(new ErrorResponse(913, 'Invalid value for root node'));
            }
            if(_.checkSpecialMongodbSymbols(node.value)){
                return callback(new ErrorResponse(601, 'Invalid value for root node'));
            }
        }
        initProfileUpdate();
    }
    function initProfileUpdate(){
        targetPid = theProfileNodes[0].pid;
        targetHid = theProfileNodes[0].humanId;
        theSet = {};
        _.each(theProfileNodes, n => {
            if(n.value == null){
                if(!theSet.$unset){
                    theSet.$unset = {};
                }
                theSet.$unset[n.path] = 1;
            } else {
                if(!theSet.$set){
                    theSet.$set = {};
                }
                theSet.$set[n.path] = n.value;
            }
        });
        getPidFromHid();
    }
    function getPidFromHid(){
        if(!targetPid){
            let callbackFn = (err, doc) => {
                if(err){
                    log.error('Mongodb Error', { code: 602, err: { message: err.message, name: err.name } });
                    callback(new ErrorResponse(602, 'Database Error'));
                } else if(doc){
                    targetPid = doc._id.toString();
                    tryToMutateProfile();
                } else {
                    callback(new ErrorResponse(802, 'Trying to persist profile update with nonexistent Human ID'));
                }
            };

            Profile.findOne({ humanId: targetHid }, { projection: { _id: 1 } }, callbackFn);
        } else {
            tryToMutateProfile();
        }
    }
    function tryToMutateProfile(){
        if(targetPid !== byThePid && clientPlatform && clientVersion){
            let callbackFn = (response, code) => {
                if(code !== 200){
                    callback(new ErrorResponseWithCode(response.index, response.message, code));
                } else {
                    doPersist();
                }
            };

            profiles.tryToMutateProfileImplementation(
                theLock, targetPid, targetHid, clientPlatform, clientVersion, _.now(),
                callbackFn
            );
        } else {
            doPersist();
        }
    }
    function doPersist(){
        let callbackFn = (err, result) => {
            if(err){
                log.error('Mongodb Error', { code: 914, err: { message: err.message, name: err.name } });
                callback(new ErrorResponse(914, 'Database Error'));
            } else if(result && result.lastErrorObject.n){
                callback(null);
            } else {
                callback(new ErrorResponse(801, 'Trying to persist profile update with nonexistent Human ID'));
            }
        };

        Profile.findOneAndUpdate(
            targetPid ? { _id: new ObjectID(targetPid) } : { humanId: targetHid },
            cloneDeep(theSet),
            callbackFn
        );
    }

    extraValidationProfileNodes();
}
function tryToPersistOnlyOneRecord(sessionObject, theOneRatingNode, callback){
    var segment, value;

    function checkRatingNode(){
        if(!sessionObject){
            return callback(new ErrorResponse(915, 'Cannot persist record without caller session'), null);
        }
        if(theOneRatingNode.value === theOneRatingNode.originalValue || theOneRatingNode.thisOneIsReadOnly){
            return callback(new ErrorResponse(916, 'Invalid record node'), null);
        }
        segment = theOneRatingNode.segment;
        value = theOneRatingNode.value;
        doPersist();
    }
    function doPersist(){
        let callbackFn = (code, response) => {
            if(code !== 200){
                callback(response, null);
            } else {
                callback(null, response);
            }
        };

        records.postARecordImplementation(
            sessionObject.pid,
            sessionObject.vkId,
            sessionObject.fbId,
            sessionObject.okId,
            segment, value,
            callbackFn
        );
    }

    checkRatingNode();
}
function tryToPersistProfileNodesAtomicAct(theLock, playerPid, theProfileNodes, theRatingNodes, receipts,
                                           battleJournalEntries, clientPlatform, clientVersion, callback){
    var hidsThatShouldBeConvertedToPids,
        profileSets, recordSets;

    function extraValidationProfileNodes(){
        if(theProfileNodes && theProfileNodes.length){
            for(let i = 0 ; i < theProfileNodes.length ; i++){
                let node = theProfileNodes[i];
                if(_.includes(SPECIAL_NUMERIC_PATHS, node.path) && (!_.isNumber(node.value) || node.value < 0)){
                    return callback(new ErrorResponse(917, 'Invalid value for root node'), null);
                }
                if(_.checkSpecialMongodbSymbols(node.value)){
                    return callback(new ErrorResponse(824, 'Invalid value for root node'), null);
                }
            }
            profileSets = {};
            _.each(theProfileNodes, n => {
                if(n.humanId && !n.pid){
                    if(!hidsThatShouldBeConvertedToPids){
                        hidsThatShouldBeConvertedToPids = [];
                    }
                    hidsThatShouldBeConvertedToPids.push(n.humanId);
                }
            });
        }
        checkRatingNodes();
    }
    function checkRatingNodes(){
        var toProcess = false;
        for(let i = theRatingNodes.length - 1 ; i >= 0 ; i--){
            let n = theRatingNodes[i];
            if(n.value === n.originalValue || n.thisOneIsReadOnly){
                theRatingNodes.splice(i, 1);
            } else {
                toProcess = true;
            }
        }
        if(toProcess){
            recordSets = {};
            _.each(theRatingNodes, n => {
                if(n.humanId && !n.pid){
                    if(!hidsThatShouldBeConvertedToPids){
                        hidsThatShouldBeConvertedToPids = [];
                    }
                    hidsThatShouldBeConvertedToPids.push(n.humanId);
                }
            });
        }
        checkBJE();
    }
    function checkBJE(){
        if(battleJournalEntries && battleJournalEntries.length){
            for(let i = 0 ; i < battleJournalEntries.length ; i++){
                let bje = battleJournalEntries[i];
                if((bje.personHumanId || bje.personHumanIdA || bje.personHumanIdB) && !hidsThatShouldBeConvertedToPids){
                    hidsThatShouldBeConvertedToPids = [];
                }
                if(bje.personHumanId){
                    hidsThatShouldBeConvertedToPids.push(bje.personHumanId);
                } else {
                    if(bje.personHumanIdA){
                        hidsThatShouldBeConvertedToPids.push(bje.personHumanIdA);
                    }
                    if(bje.personHumanIdB){
                        hidsThatShouldBeConvertedToPids.push(bje.personHumanIdB);
                    }
                }
            }
        }
        if(hidsThatShouldBeConvertedToPids && hidsThatShouldBeConvertedToPids.length){
            getPidsFromHids();
        } else {
            turnNodesIntoSets();
        }
    }
    function getPidsFromHids(){
        let callbackFn = (err, docs) => {
            if(err){
                log.error('Mongodb Error', { code: 850, err: { message: err.message, name: err.name } });
                callback(new ErrorResponse(850, 'Database Error'), null);
            } else if(docs.length === hidsThatShouldBeConvertedToPids.length){
                hidsThatShouldBeConvertedToPids = undefined;
                _.each(docs, d => {
                    var thePid;
                    if(theProfileNodes){
                        _.each(theProfileNodes, n => {
                            if(n.humanId === d.humanId){
                                if(!thePid){
                                    thePid = d._id.toString();
                                }
                                n.pid = thePid;
                            }
                        });
                    }
                    if(theRatingNodes){
                        _.each(theRatingNodes, n => {
                            if(n.humanId === d.humanId){
                                if(!thePid){
                                    thePid = d._id.toString();
                                }
                                n.pid = thePid;
                            }
                        });
                    }
                    if(battleJournalEntries && battleJournalEntries.length){
                        _.each(battleJournalEntries, bje => {
                            if(bje.personHumanId === d.humanId){
                                delete bje.personHumanId;
                                if(!thePid){
                                    thePid = d._id.toString();
                                }
                                bje.pid = thePid;
                            } else {
                                if(bje.personHumanIdA === d.humanId){
                                    delete bje.personHumanIdA;
                                    if(!thePid){
                                        thePid = d._id.toString();
                                    }
                                    bje.pida = thePid;
                                }
                                if(bje.personHumanIdB === d.humanId){
                                    delete bje.personHumanIdB;
                                    if(!thePid){
                                        thePid = d._id.toString();
                                    }
                                    bje.pidb = thePid;
                                }
                            }
                        });
                    }
                });
                turnNodesIntoSets();
            } else {
                callback(new ErrorResponse(868, 'Some of the presented Human IDs does not exist'), null);
            }
        };

        hidsThatShouldBeConvertedToPids = _.uniq(hidsThatShouldBeConvertedToPids);
        Profile.find(
            { humanId: { $in: hidsThatShouldBeConvertedToPids } },
            { projection: { _id: 1, humanId: 1 } }
        ).limit(hidsThatShouldBeConvertedToPids.length).toArray(callbackFn);
    }
    function turnNodesIntoSets(){
        if(theProfileNodes){
            _.each(theProfileNodes, n => {
                if(!profileSets[n.pid]){
                    profileSets[n.pid] = { hid: n.humanId, v: {} };
                }
                profileSets[n.pid].v[n.path] = n.value
            });
        }
        if(theRatingNodes){
            _.each(theRatingNodes, n => {
                if(!recordSets[n.pid]){
                    recordSets[n.pid] = { hid: n.humanId, v: {} };
                }
                recordSets[n.pid].v[n.segment] = n.value
            });
        }
        if(profileSets || recordSets || (receipts && receipts.length) || (battleJournalEntries && battleJournalEntries.length)){
            doPersist();
        } else {
            callback(null, true);
        }
    }
    function doPersist(){
        let callbackFn = err => {
            if(err){
                callback(err, null);
            } else {
                callback(null, true);
            }
        };

        atomicActs.changeProfileAndStuff(
            theLock, playerPid, profileSets, recordSets, receipts, battleJournalEntries,
            clientPlatform, clientVersion,
            callbackFn
        );
    }

    extraValidationProfileNodes();
}
async function getSelfRatingNode(playerPid, segment, fakeProfileAccess){
    var resolve, reject;

    function checkSegment(){
        if(goblinBase.leaderboardsConfig.whitelistSegments){
            if(_.includes(goblinBase.leaderboardsConfig.whitelistSegments, segment)){
                soFake();
            } else {
                reject(new ErrorResponse(811, 'Unknown segment'));
            }
        } else {
            soFake();
        }
    }
    function soFake(){
        if(fakeProfileAccess){
            resolve(new RatingNode(undefined, playerPid, segment, _.random(1, 1000), false, fakeProfileAccess));
        } else {
            tryToGetRecordFromCollection();
        }
    }
    function tryToGetRecordFromCollection(){
        let callbackFn = (err, doc) => {
            if(err){
                log.error('Mongodb Error', { code: 813, err: { message: err.message, name: err.name } });
                reject(new ErrorResponse(813, 'Database Error'));
            } else if(doc){
                resolve(new RatingNode(undefined, playerPid, segment, doc.val, false, fakeProfileAccess));
            } else {
                resolve(new RatingNode(undefined, playerPid, segment, null, false, fakeProfileAccess));
            }
        };

        Record.findOne({ pid: new ObjectID(playerPid), segm: segment }, { projection: { val: 1, _id: 0 } }, callbackFn);
    }

    return new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
        checkSegment();
    });
}
function addTheRatingNode(playerHid, playerPid, segment, fakeProfileAccess){
    if(fakeProfileAccess){
        return new RatingNode(playerHid, playerPid, segment, _.random(1, 1000), false, fakeProfileAccess);
    } else {
        return new RatingNode(playerHid, playerPid, segment, null, false, fakeProfileAccess);
    }
}
async function getSomeonesRatingNode(theLock, targetHumanId, segment, fakeProfileAccess){
    var resolve, reject, targetPlayerPid;

    function checkSegment(){
        if(goblinBase.leaderboardsConfig.whitelistSegments){
            if(_.includes(goblinBase.leaderboardsConfig.whitelistSegments, segment)){
                soFake();
            } else {
                reject(new ErrorResponse(814, 'Unknown segment'));
            }
        } else {
            soFake();
        }
    }
    function soFake(){
        if(fakeProfileAccess){
            resolve(new RatingNode(targetHumanId, undefined, segment, _.random(1, 1000), true, fakeProfileAccess));
        } else {
            getTargetProfileRecordAndPid();
        }
    }
    function getTargetProfileRecordAndPid(){
        let callbackFn = (err, doc) => {
            if(err){
                log.error('Mongodb Error', { code: 815, err: { message: err.message, name: err.name } });
                reject(new ErrorResponse(815, 'Database Error'));
            } else if(doc){
                targetPlayerPid = doc._id.toString();
                checkAtomicActs();
            } else {
                resolve(null);
            }
        };

        Profile.findOne({ humanId: targetHumanId }, { projection: { _id: 1 } }, callbackFn);
    }
    function checkAtomicActs(){
        let callbackFn = err => {
            if(err){
                reject(err);
            } else {
                tryToGetRecordFromCollection();
            }
        };

        atomicActs.checkAtomicActs(theLock, targetPlayerPid, callbackFn);
    }
    function tryToGetRecordFromCollection(){
        let callbackFn = (err, doc) => {
            if(err){
                log.error('Mongodb Error', { code: 816, err: { message: err.message, name: err.name } });
                reject(new ErrorResponse(816, 'Database Error'));
            } else if(doc){
                resolve(new RatingNode(doc.hid, targetPlayerPid, segment, doc.val, true, fakeProfileAccess));
            } else {
                resolve(null);
            }
        };

        Record.findOne({ pid: new ObjectID(targetPlayerPid), segm: segment }, { projection: { val: 1, _id: 0 } }, callbackFn);
    }

    return new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
        checkSegment();
    });
}
async function listAllRatings(playerPid, playerHid, tryToExcludeSegments, fakeProfileAccess){
    var resolve, reject;

    function maybeFakeAccess(){
        if(fakeProfileAccess){
            resolve({ fakesegm: new RatingNode(playerHid, playerPid, 'fakesegm', _.random(1, 1000), false, fakeProfileAccess) });
        } else {
            tryToGetRecordsFromCollection();
        }
    }
    function tryToGetRecordsFromCollection(){
        let callbackFn = (err, docs) => {
            if(err){
                log.error('Mongodb Error', { code: 818, err: { message: err.message, name: err.name } });
                reject(new ErrorResponse(818, 'Database Error'));
            } else if(docs && docs.length){
                let out = {};
                _.each(docs, d => {
                    if(d.val >= 0){
                        out[d.segm] = new RatingNode(playerHid, playerPid, d.segm, d.val, false, fakeProfileAccess);
                    }
                });
                resolve(out);
            } else {
                resolve({});
            }
        };

        var q = { pid: new ObjectID(playerPid) };
        if(tryToExcludeSegments && tryToExcludeSegments.length){
            q.segm = { $nin: tryToExcludeSegments };
        }
        Record.find(q, { projection: { segm: 1, val: 1, _id: 0 } }).toArray(callbackFn);
    }

    return new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
        maybeFakeAccess();
    });
}

function checkPath(path){
    if(path.endsWith('.')){
        return false;
    } else {
        for(let i = 0 ; i < path.length ; i++){
            if(path.charAt(i) === '.'){
                if(i === 0 || i === path.length - 1 || path.charAt(i + 1) === '.'){
                    return false;
                }
            }
        }
        return true;
    }
}