'use strict';

module.exports = {
    listBattles,
    listPveBattles
};

const log = require('../../../index.js').getGoblinBase().logsHook;

var _ = require('lodash'),
    ObjectID = require('mongodb').ObjectID,
    sessionKeeper = require('../../webMiddleware/sessionKeeper.js');

var ErrorResponse = require('../../objects/ErrorResponse.js');

var BattleModel = require('../../persistenceSubsystem/dao/battle.js'),
    PveBattleModel = require('../../persistenceSubsystem/dao/pveBattle.js'),
    Profile = require('../../persistenceSubsystem/dao/profile.js');

function listBattles(sessionObject, offset, limit, auto, callback){
    var now = _.now(), lastHumanId, battlesListing;

    function checkInput(){
        offset = parseInt(offset) || 0;
        limit = parseInt(limit) || 20;
        if(offset < 0){
            offset = 0;
        }
        if(limit < 1 || limit > 20){
            limit = 20;
        }
        checkSession();
    }
    function checkSession(){
        if(sessionObject.aid && sessionObject.pcrd && sessionObject.pid){
            getLastBattleHumanId();
        } else {
            justUnlockSession(500, new ErrorResponse(556, 'No profile'));
        }
    }
    function getLastBattleHumanId(){
        let callbackFn = (err, doc) => {
            if(err){
                log.error('Mongodb Error', { code: 593, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(593, 'Database Error'));
            } else if(doc){
                lastHumanId = doc.hid;
                getBattles();
            } else {
                justUnlockSession(200, { l: [], now });
            }
        };

        BattleModel.findOne({}, { projection: { hid: 1 }, sort: { hid: -1 } }, callbackFn);
    }
    function getBattles(){
        let callbackFn = (err, docs) => {
            if(err){
                log.error('Mongodb Error', { code: 434, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(434, 'Database Error'));
            } else {
                battlesListing = docs;
                if(battlesListing.length){
                    getProfiles();
                } else {
                    justUnlockSession(200, { l: [], now });
                }
            }
        };

        var q = { 
            $or: [{ pida: new ObjectID(sessionObject.pid) }, { pidb: new ObjectID(sessionObject.pid) }],
            hid: { $lte: lastHumanId - offset, $gt: lastHumanId - limit - offset }
        };
        if(auto){
            q.auto = true;
        }
        BattleModel.find(q, { projection: { _id: 0 }, sort: { cat: -1 } }).toArray(callbackFn);
    }
    function getProfiles(){
        let callbackFn = (err, docs) => {
            if(err){
                log.error('Mongodb Error', { code: 439, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(439, 'Database Error'));
            } else {
                _.each(battlesListing, b => {
                    let thePIDA = b.pida.toString(),
                        thePIDB = b.pidb.toString();
                    for(let i = 0 ; i < docs.length ; i++){
                        let theD = docs[i],
                            theID = theD._id.toString();
                        if(thePIDA === theID){
                            b.hida = theD.humanId;
                        } else if(thePIDB === theID){
                            b.hidb = theD.humanId;
                        }
                        if(b.hida && b.hidb){
                            break;
                        }
                    }
                    delete b.pida;
                    delete b.pidb;
                    b.id = b.hid;
                    delete b.hid;
                });
                justUnlockSession(200, { l: battlesListing, now });
            }
        };

        var pids = [];
        _.each(battlesListing, b => pids.push(new ObjectID(b.pida), new ObjectID(b.pidb)));
        Profile.find({ _id: { $in: pids } }, { projection: { humanId: 1, _id: 1 } }).toArray(callbackFn);
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 89, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkInput();
}
function listPveBattles(sessionObject, offset, limit, callback){
    var now = _.now(), battlesListing, lastHumanId;

    function checkInput(){
        offset = parseInt(offset) || 0;
        limit = parseInt(limit) || 20;
        if(offset < 0){
            offset = 0;
        }
        if(limit < 1 || limit > 20){
            limit = 20;
        }
        checkSession();
    }
    function checkSession(){
        if(sessionObject.aid && sessionObject.pcrd && sessionObject.pid){
            getLastBattleHumanId();
        } else {
            justUnlockSession(500, new ErrorResponse(594, 'No profile'));
        }
    }
    function getLastBattleHumanId(){
        let callbackFn = (err, doc) => {
            if(err){
                log.error('Mongodb Error', { code: 595, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(595, 'Database Error'));
            } else if(doc){
                lastHumanId = doc.hid;
                getBattles();
            } else {
                justUnlockSession(200, { l: [], now });
            }
        };

        PveBattleModel.findOne({}, { projection: { hid: 1 }, sort: { hid: -1 } }, callbackFn);
    }
    function getBattles(){
        let callbackFn = (err, docs) => {
            if(err){
                log.error('Mongodb Error', { code: 596, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(596, 'Database Error'));
            } else {
                battlesListing = docs;
                if(battlesListing.length){
                    getProfiles();
                } else {
                    justUnlockSession(200, { l: [], now });
                }
            }
        };

        PveBattleModel.find(
            { pid: new ObjectID(sessionObject.pid), hid: { $lte: lastHumanId - offset, $gt: lastHumanId - limit - offset } },
            { projection: { _id: 0 }, sort: { cat: -1 } }
        ).toArray(callbackFn);
    }
    function getProfiles(){
        let callbackFn = (err, docs) => {
            if(err){
                log.error('Mongodb Error', { code: 597, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(597, 'Database Error'));
            } else {
                for(let i = 0 ; i < battlesListing.length ; i++){
                    let b = battlesListing[i];
                    for(let j = 0 ; j < docs.length ; j++){
                        let p = docs[j];
                        if(b.pid + '' === p._id.toString()){
                            b.hid = p.humanId;
                            break;
                        }
                    }
                    delete b.pid;
                    b.id = b.hid;
                    delete b.hid;
                }
                justUnlockSession(200, { l: battlesListing, now });
            }
        };

        Profile.find(
            { _id: { $in: battlesListing.map(e => new ObjectID(e.pid)) } },
            { projection: { humanId: 1, _id: 1 } }
        ).toArray(callbackFn);
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 598, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkInput();
}