'use strict';

module.exports = {
    itemInfoCallback,
    orderStatusChangeCallback,
    listPurchases,
    consumePurchase
};

const goblinBase = require('../../../index.js').getGoblinBase(),
    log = goblinBase.logsHook;

const PLATFORM_WEB_VK = 'webvk';

var _ = require('lodash'),
    crypto = require('crypto');

let ErrorResponse = require('../../objects/ErrorResponse');

var VkPurchase = require('../../persistenceSubsystem/dao/vkPurchase.js'),
    VkPurchaseCounter = require('../../persistenceSubsystem/dao/sequenceCounter.js'),
    Profile = require('../../persistenceSubsystem/dao/profile.js'),
    Account = require('../../persistenceSubsystem/dao/account.js');

function itemInfoCallback(requestBody, callback){
    function checkBody(){
        if(!requestBody.sig){
            callback(400, { error: { error_code: 10, critical: true } });
        } else if(!requestBody.item){
            callback(400, { error: { error_code: 20, critical: true } });
        } else if(!requestBody.user_id){
            callback(400, { error: { error_code: 22, critical: true } });
        } else if(!requestBody.app_id || requestBody.app_id !== `${goblinBase.vkCredentials.clientId}`){
            callback(400, { error: { error_code: 11, critical: true } });
        } else {
            checkSig();
        }
    }
    function checkSig(){
        var keys = _.stableSortByCopy(_.keys(requestBody).filter(e => e !== 'sig'), e => e, true),
            msg = keys.map(e => e + '=' + requestBody[e]).join('') + goblinBase.vkCredentials.clientSecret,
            sigToCompare = crypto.createHash('md5').update(Buffer.from(msg), 'binary').digest('hex');

        if(requestBody.sig === sigToCompare){
            checkPlayer();
        } else {
            callback(400, { error: { error_code: 10, critical: true } });
        }
    }
    function checkPlayer(){
        let callbackFn = (err, doc) => {
            if(err){
                log.error('Mongodb Error', { code: 430, err: { message: err.message, name: err.name } });
                callback(500, { error: { error_code: 2, critical: false } });
            } else if(doc){
                tryToGetItemData();
            } else {
                callback(400, { error: { error_code: 22, critical: true } });
            }
        };

        Account.findOne({ vk: requestBody.user_id }, { projection: { pid: 1 } }, callbackFn);
    }
    function tryToGetItemData(){
        var itemData = goblinBase.vkInappValidationConfig.iapItems
            .find(e => e.itemId === requestBody.item && e.targetBundleId === PLATFORM_WEB_VK);
        if(itemData){
            callback(200, { response: { title: itemData.title, photo_url: itemData.photoUrl, price: itemData.price } });
        } else {
            callback(400, { error: { error_code: 20, critical: true } });
        }
    }

    checkBody();
}
function orderStatusChangeCallback(requestBody, callback){
    var pid, itemData, nextPurchaseNum;

    function checkBody(){
        if(!requestBody.app_id || requestBody.app_id + '' !== `${goblinBase.vkCredentials.clientId}`
            || !requestBody.user_id
            || !requestBody.order_id
            || !requestBody.date
            || !requestBody.status || requestBody.status !== 'chargeable'
            || !requestBody.sig
            || !requestBody.item){

            callback(400, { error: { error_code: 11, critical: true } });
        } else {
            checkSig();
        }
    }
    function checkSig(){
        var keys = _.stableSortByCopy(_.keys(requestBody).filter(e => e !== 'sig'), e => e, true),
            msg = keys.map(e => e + '=' + requestBody[e]).join('') + goblinBase.vkCredentials.clientSecret,
            sigToCompare = crypto.createHash('md5').update(Buffer.from(msg), 'binary').digest('hex');

        if(requestBody.sig === sigToCompare){
            tryToGetPurchase();
        } else {
            callback(400, { error: { error_code: 10, critical: true } });
        }
    }
    function tryToGetPurchase(){
        let callbackFn = (err, doc) => {
            if(err){
                log.error('Mongodb Error', { code: 431, err: { message: err.message, name: err.name } });
                callback(500, { error: { error_code: 2, critical: false } });
            } else if(doc){
                callback(200, { response: { order_id: requestBody.order_id, app_order_id: doc.purchNum } })
            } else {
                getPlayerProfile();
            }
        };

        VkPurchase.findOne({ orderId: requestBody.order_id }, { projection: { purchNum: 1 } }, callbackFn);
    }
    function getPlayerProfile(){
        let callbackFn = (err, doc) => {
            if(err){
                log.error('Mongodb Error', { code: 428, err: { message: err.message, name: err.name } });
                callback(500, { error: { error_code: 2, critical: false } });
            } else if(doc){
                pid = doc._id.toString();
                tryToGetItemData();
            } else {
                callback(400, { error: { error_code: 22, critical: true } });
            }
        };

        Profile.findOne({ vk: requestBody.user_id }, { projection: { _id: 1 } }, callbackFn);
    }
    function tryToGetItemData(){
        itemData = goblinBase.vkInappValidationConfig.iapItems.find(e => e.itemId === requestBody.item);
        if(!itemData){
            callback(400, { error: { error_code: 20, critical: true } });
        } else {
            generateNewPurchaseNum();
        }
    }
    function generateNewPurchaseNum(){
        let callbackFn = (err, sequenceValue) => {
            if(err){
                callback(500, { error: { error_code: 2, critical: false } });
            } else {
                nextPurchaseNum = sequenceValue;
                tryToPersistVkPurchase();
            }
        };

        getNextSequenceValue(callbackFn);
    }
    function tryToPersistVkPurchase(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('Mongodb Error', { code: 432, err: { message: err.message, name: err.name } });
                callback(500, { error: { error_code: 2, critical: false } });
            } else if(( response.upserted && response.upserted.length > 0) || (response.result && response.result.upserted.length > 0)){
                callback(200, { response: { order_id: requestBody.order_id, app_order_id: nextPurchaseNum } });
            } else {
                getConcurrentlyInsertedPurchaseNum();
            }
        };

        VkPurchase.updateOne(
            { orderId: requestBody.order_id },
            {
                $setOnInsert: {
                    purchNum: nextPurchaseNum,
                    itemId: itemData.itemId,
                    pid,
                    orderId: requestBody.order_id,
                    isConsumed: false,
                    cat: Math.floor(_.now() / 1000)
                }
            },
            { upsert: true },
            callbackFn
        );
    }
    function getConcurrentlyInsertedPurchaseNum(){
        let callbackFn = (err, doc) => {
            if(err || !doc){
                log.error('Mongodb Error', { code: 433, err: { message: err.message, name: err.name } });
                callback(500, { error: { error_code: 2, critical: false } });
            } else {
                callback(200, { response: { order_id: requestBody.order_id, app_order_id: doc.purchNum } })
            }
        };

        VkPurchase.findOne({ orderId: requestBody.order_id }, { projection: { purchNum: 1 } }, callbackFn);
    }

    checkBody();
}
function listPurchases(sessionObject, offset, limit, callback){
    var firstPurchaseNum, listing;

    function checkInput(){
        offset = parseInt(offset) || 0;
        limit = parseInt(limit) || 20;
        if(offset < 0){
            offset = 0;
        }
        if(limit <= 0 || limit > 20){
            limit = 20;
        }
        checkSession();
    }
    function checkSession(){
        if(sessionObject.aid){
            if(sessionObject.pcrd && sessionObject.pid && sessionObject.hid){
                getFirstPurchaseNum();
            } else {
                callback(400, new ErrorResponse(992, 'You do not have a profile or should get one'));
            }
        } else {
            callback(500, new ErrorResponse(993, 'Malformed session'));
        }
    }
    function getFirstPurchaseNum(){
        let callbackFn = (err, doc) => {
            if(err){
                log.error('Mongodb Error', { code: 647, err: { message: err.message, name: err.name } });
                callback(new ErrorResponse(647, 'Database Error'), null);
            } else if(doc){
                firstPurchaseNum = doc.purchNum;
                doList();
            } else {
                callback(200, []);
            }
        };

        VkPurchase.findOne({ pid: sessionObject.pid }, { projection: { purchNum: 1 }, sort: { purchNum: 1 } }, callbackFn);
    }
    function doList(){
        let callbackFn = (err, docs) => {
            if(err){
                log.error('Mongodb Error', { code: 176, err: { message: err.message, name: err.name } });
                callback(new ErrorResponse(176, 'Database Error'), null);
            } else {
                listing = docs;
                formResponse();
            }
        };

        VkPurchase.find(
            { pid: sessionObject.pid, purchNum: { $gte: firstPurchaseNum } },
            { projection: { purchNum: 1, itemId: 1, isConsumed: 1, cat: 1 }, sort: { purchNum: 1 }, skip: offset, limit }
        ).toArray(callbackFn);
    }
    function formResponse(){
        if(listing.length){
            let response = listing.map(e => { return {
                purchaseNum: e.purchNum,
                itemId: e.itemId,
                isConsumed: e.isConsumed,
                createdAt: e.cat
            }});
            callback(200, response);
        } else {
            callback(200, []);
        }
    }

    checkInput();
}
function consumePurchase(sessionObject, purchaseNum, callback){
    var targetDocId;

    function checkInput(){
        if(_.isNumber(purchaseNum) && !isNaN(purchaseNum) && purchaseNum > 0){
            checkSession();
        } else {
            callback(400, new ErrorResponse(648, 'Invalid inputs'));
        }
    }
    function checkSession(){
        if(sessionObject.aid){
            if(sessionObject.pcrd && sessionObject.pid && sessionObject.hid){
                precheckPurchase();
            } else {
                callback(400, new ErrorResponse(994, 'You do not have a profile or should get one'));
            }
        } else {
            callback(500, new ErrorResponse(995, 'Malformed session'));
        }
    }
    function precheckPurchase(){
        let callbackFn = (err, theDoc) => {
            if(err){
                log.error('Mongodb Error', { code: 1085, err: { message: err.message, name: err.name } });
                callback(500, new ErrorResponse(1085, 'Database Error'));
            } else if(theDoc){
                if(theDoc.isConsumed){
                    callback(400, new ErrorResponse(1086, 'Already consumed purchase'));
                } else {
                    targetDocId = theDoc._id;
                    doStuff();
                }
            } else {
                callback(400, new ErrorResponse(1087, 'Unknown purchase'));
            }
        };

        VkPurchase.findOne(
            { purchNum: purchaseNum, pid: sessionObject.pid },
            { projection: { _id: 1, isConsumed: 1 } },
            callbackFn
        );
    }
    function doStuff(){
        let callbackFn = (err, result) => {
            if(err){
                log.error('Mongodb Error', { code: 178, err: { message: err.message, name: err.name } });
                callback(500, new ErrorResponse(178, 'Database Error'));
            } else if(result.result ? result.result.nModified : result.nModified){
                callback(200);
            } else {
                callback(400, new ErrorResponse(179, 'Unknown or already consumed purchase'));
            }
        };

        VkPurchase.updateOne(
            { _id: targetDocId, isConsumed: false },
            { $set: { isConsumed: true } },
            callbackFn
        );
    }

    checkInput();
}
function getNextSequenceValue(callback){
    const SEQUENCE_NAME = 'vkPurchaseId';

    VkPurchaseCounter.getNextSequenceValue(SEQUENCE_NAME, 1, callback);
}