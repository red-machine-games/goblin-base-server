'use strict';

module.exports = {
    swapKeyDotsToSpecialCrap,
    swapSpecialCrapToKeyDots,
    countAllCollections
};

const log = require('../../../index.js').getGoblinBase().logsHook;

const SPECIAL_DOT_SIGN = '%dot%',
    LAZY_CACHE_TTL_MS = 1000 * 60 * 5;

var _ = require('lodash'),
    async = require('async'),
    opClients = require('../../operativeSubsystem/opClients.js');

var ErrorResponse = require('../../objects/ErrorResponse.js');

var Account = require('../dao/account.js'),
    AtomicAct = require('../dao/atomicAct.js'),
    Battle = require('../dao/battle.js'),
    OkPurchase = require('../dao/okPurchase.js'),
    Profile = require('../dao/profile.js'),
    PveBattle = require('../dao/pveBattle.js'),
    Receipt = require('../dao/receipt.js'),
    Record = require('../dao/record.js'),
    SequenceCounter = require('../dao/sequenceCounter.js'),
    Ticket = require('../dao/ticket.js'),
    VkPurchase = require('../dao/vkPurchase.js');

function swapKeyDotsToSpecialCrap(inObj){
    return transformEveryKeyIn(inObj, k => k.indexOf('.') >= 0, k => k.split('.').join(SPECIAL_DOT_SIGN));
}
function swapSpecialCrapToKeyDots(inObj){
    return transformEveryKeyIn(inObj, k => k.indexOf(SPECIAL_DOT_SIGN) >= 0, k => k.split(SPECIAL_DOT_SIGN).join('.'));
}

function transformEveryKeyIn(inObj, check, transformator){
    for(let k in inObj){
        if(inObj.hasOwnProperty(k)){
            let val = inObj[k];
            if(check(k)){
                let newKey = transformator(k);
                delete inObj[k];
                inObj[newKey] = transformEveryKeyIn(val, check, transformator);
            } else if(_.isPlainObject(val)){
                inObj[k] = transformEveryKeyIn(val, check, transformator);
            } else if(_.isArray(val)){
                for(let i = 0 ; i < val.length ; i++){
                    val[i] = transformEveryKeyIn(val[i], check, transformator);
                }
            }
        }
    }
    return inObj;
}

function countAllCollections(callback){
    var theCounts;

    function tryToGetFromOp(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 981, err: { code: err.code, command: err.command, message: err.message } });
                callback(new ErrorResponse(981, 'OP Error'), null);
            } else if(response){
                callback(null, JSON.parse(response));
            } else {
                countTheCollections();
            }
        };

        opClients.getServiceClient().getRedis().get('col_counts', callbackFn);
    }
    function countTheCollections(){
        let callbackFn = (err, responses) => {
            if(err){
                callback(err, null);
            } else {
                theCounts = {
                    Account: responses[0],
                    AtomicAct: responses[1],
                    Battle: responses[2],
                    Counter: responses[3],
                    CustomFunction: responses[4],
                    OkPurchase: responses[5],
                    Profile: responses[6],
                    PveBattle: responses[7],
                    Receipt: responses[8],
                    Record: responses[9],
                    SequenceCounter: responses[10],
                    Ticket: responses[11],
                    VkPurchase: responses[12],
                };
                cacheAndReturn();
            }
        };

        async.parallel([
            cb => Account.countDocuments({}, cb),
            cb => AtomicAct.countDocuments({}, cb),
            cb => Battle.countDocuments({}, cb),
            cb => OkPurchase.countDocuments({}, cb),
            cb => Profile.countDocuments({}, cb),
            cb => PveBattle.countDocuments({}, cb),
            cb => Receipt.countDocuments({}, cb),
            cb => Record.countDocuments({}, cb),
            cb => SequenceCounter.countDocuments({}, cb),
            cb => Ticket.countDocuments({}, cb),
            cb => VkPurchase.countDocuments({}, cb),
        ], callbackFn);
    }
    function cacheAndReturn(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 668, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(null, theCounts);
        };

        opClients.getServiceClient().getRedis().set('col_counts', JSON.stringify(theCounts), 'px', LAZY_CACHE_TTL_MS, callbackFn);
    }

    tryToGetFromOp();
}