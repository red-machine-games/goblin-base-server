'use strict';

module.exports = {
    serviceCallback,
    listPurchases,
    consumePurchase
};

const goblinBase = require('../../../index.js').getGoblinBase(),
    log = goblinBase.logsHook;

const PLATFORM_WEB_OK = 'webok';

const ERROR_TYPE_UNKNOWN = 1,
    ERROR_TYPE_SERVICE = 2,
    ERROR_TYPE_CALLBACK_INVALID_PAYMENT = 1001,
    ERROR_TYPE_SYSTEM = 9999,
    ERROR_TYPE_PARAM_SIGNATURE = 104,
    ERROR_MESSAGES = {
        [ERROR_TYPE_UNKNOWN]: 'UNKNOWN: пожалуйста, попробуйте позже. Если проблема осталась - обратитесь в службу поддержки.',
        [ERROR_TYPE_SERVICE]: 'SERVICE: сервис временно недоступен. Попробуйте позже.',
        [ERROR_TYPE_CALLBACK_INVALID_PAYMENT]: 'CALLBACK_INVALID_PAYMENT: неверные данные платежа, попробуйте позже. Если проблема осталась - обратитесь в службу поддержки.',
        [ERROR_TYPE_SYSTEM]: 'SYSTEM: критическая ошибка. Пожалуйста, обратитесь в службу поддержки.',
        [ERROR_TYPE_PARAM_SIGNATURE]: 'PARAM_SIGNATURE: неверная сигнатура. Пожалуйста, обратитесь в службу поддержки.'

    };

var _ = require('lodash'),
    crypto = require('crypto');

var OkPurchase = require('../../persistenceSubsystem/dao/okPurchase.js'),
    Profile = require('../../persistenceSubsystem/dao/profile.js'),
    OkPurchaseCounter = require('../../persistenceSubsystem/dao/sequenceCounter.js');

var ErrorResponse = require('../../objects/ErrorResponse.js');

function serviceCallback(queryBody, callback){
    var theTargetProduct, pid, nextPurchaseNum;

    function checkAvailability(){
        if(!goblinBase.okCredentials || !goblinBase.okInappValidationConfig){
            callback(503, printError(ERROR_TYPE_SERVICE));
        } else {
            checkQuery();
        }
    }
    function checkQuery(){
        if(!queryBody.product_code || !queryBody.amount || !queryBody.sig || !queryBody.uid){
            callback(400, printError(ERROR_TYPE_CALLBACK_INVALID_PAYMENT));
        } else {
            checkProduct();
        }
    }
    function checkProduct(){
        theTargetProduct = goblinBase.okInappValidationConfig.iapItems
            .find(e =>
                e.productCode === queryBody.product_code
                && (!queryBody.product_option || e.productOption === queryBody.product_option)
                && e.targetBundleId === PLATFORM_WEB_OK
            );
        if(!theTargetProduct){
            callback(400, printError(ERROR_TYPE_CALLBACK_INVALID_PAYMENT));
        } else {
            checkSignature();
        }
    }
    function checkSignature(){
        var keys = _.stableSortByCopy(_.keys(queryBody).filter(e => e !== 'sig'), e => e, true),
            msg = keys.map(e => e + '=' + queryBody[e]).join('') + goblinBase.okCredentials.applicationSecretKey,
            sigToCompare = crypto.createHash('md5').update(Buffer.from(msg), 'binary').digest('hex');

        if(queryBody.sig === sigToCompare){
            tryToGetTransaction();
        } else {
            callback(400, printError(ERROR_TYPE_PARAM_SIGNATURE));
        }
    }
    function tryToGetTransaction(){
        let callbackFn = (err, doc) => {
            if(err){
                log.error('Mongodb Error', { code: 569, err: { message: err.message, name: err.name } });
                callback(500, printError(ERROR_TYPE_SYSTEM));
            } else if(doc){
                callback(200, printOkayPayment());
            } else {
                getPlayerProfile();
            }
        };

        OkPurchase.findOne({ txid: queryBody.transaction_id }, { projection: { purchNum: 1 } }, callbackFn);
    }
    function getPlayerProfile(){
        let callbackFn = (err, doc) => {
            if(err){
                log.error('Mongodb Error', { code: 570, err: { message: err.message, name: err.name } });
                callback(500, printError(ERROR_TYPE_SYSTEM));
            } else if(doc){
                pid = doc._id.toString();
                generateNewPurchaseNum();
            } else {
                callback(400, printError(ERROR_TYPE_SYSTEM));
            }
        };

        Profile.findOne({ ok: queryBody.uid }, { projection: { _id: 1 } }, callbackFn);
    }
    function generateNewPurchaseNum(){
        let callbackFn = (err, sequenceValue) => {
            if(err){
                callback(500, printError(ERROR_TYPE_SYSTEM));
            } else {
                nextPurchaseNum = sequenceValue;
                tryToPersistOkPurchase();
            }
        };

        getNextSequenceValue(callbackFn);
    }
    function tryToPersistOkPurchase(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('Mongodb Error', { code: 571, err: { message: err.message, name: err.name } });
                callback(500, printError(ERROR_TYPE_SYSTEM));
            } else if(( response.upserted && response.upserted.length > 0) || (response.result && response.result.upserted.length > 0)){
                callback(200, printOkayPayment());
            } else {
                getConcurrentlyInsertedPurchaseNum();
            }
        };

        OkPurchase.updateOne(
            { txid: queryBody.transaction_id },
            {
                $setOnInsert: {
                    purchNum: nextPurchaseNum,
                    pcode: queryBody.product_code,
                    popt: queryBody.product_option,
                    pid,
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
                log.error('Mongodb Error', { code: 572, err: { message: err.message, name: err.name } });
                callback(500, printError(ERROR_TYPE_SYSTEM));
            } else {
                callback(200, printOkayPayment());
            }
        };

        OkPurchase.findOne({ txid: queryBody.transaction_id }, { projection: { purchNum: 1 } }, callbackFn);
    }

    checkAvailability();
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
                callback(400, new ErrorResponse(221, 'You do not have a profile or should get one'));
            }
        } else {
            callback(500, new ErrorResponse(989, 'Malformed session'));
        }
    }
    function getFirstPurchaseNum(){
        let callbackFn = (err, doc) => {
            if(err){
                log.error('Mongodb Error', { code: 640, err: { message: err.message, name: err.name } });
                callback(new ErrorResponse(640, 'Database Error'), null);
            } else if(doc){
                firstPurchaseNum = doc.purchNum;
                doList();
            } else {
                callback(200, []);
            }
        };

        OkPurchase.findOne({ pid: sessionObject.pid }, { projection: { purchNum: 1 }, sort: { purchNum: 1 } }, callbackFn);
    }
    function doList(){
        let callbackFn = (err, docs) => {
            if(err){
                log.error('Mongodb Error', { code: 573, err: { message: err.message, name: err.name } });
                callback(500, new ErrorResponse(573, 'Database Error'));
            } else {
                listing = docs;
                formResponse();
            }
        };

        OkPurchase.find(
            { pid: sessionObject.pid, purchNum: { $gte: firstPurchaseNum } },
            { projection: { purchNum: 1, pcode: 1, popt: 1, isConsumed: 1, cat: 1 }, sort: { purchNum: 1 }, skip: offset, limit }
        ).toArray(callbackFn);
    }
    function formResponse(){
        if(listing.length){
            let response = listing.map(e => { return {
                purchaseNum: e.purchNum,
                productCode: e.pcode,
                productOption: e.popt,
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
            callback(400, new ErrorResponse(641, 'Invalid inputs'));
        }
    }
    function checkSession(){
        if(sessionObject.aid){
            if(sessionObject.pcrd && sessionObject.pid && sessionObject.hid){
                precheckPurchase();
            } else {
                callback(400, new ErrorResponse(990, 'You do not have a profile or should get one'));
            }
        } else {
            callback(500, new ErrorResponse(991, 'Malformed session'));
        }
    }
    function precheckPurchase(){
        let callbackFn = (err, theDoc) => {
            if(err){
                log.error('Mongodb Error', { code: 1082, err: { message: err.message, name: err.name } });
                callback(500, new ErrorResponse(1082, 'Database Error'));
            } else if(theDoc){
                if(theDoc.isConsumed){
                    callback(400, new ErrorResponse(1083, 'Already consumed purchase'));
                } else {
                    targetDocId = theDoc._id;
                    doStuff();
                }
            } else {
                callback(400, new ErrorResponse(1084, 'Unknown purchase'));
            }
        };

        OkPurchase.findOne(
            { pid: sessionObject.pid, purchNum: purchaseNum },
            { projection: { _id: 1, isConsumed: 1 } },
            callbackFn
        );
    }
    function doStuff(){
        let callbackFn = (err, result) => {
            if(err){
                log.error('Mongodb Error', { code: 574, err: { message: err.message, name: err.name } });
                callback(500, new ErrorResponse(574, 'Database Error'));
            } else if(result.result ? result.result.nModified : result.nModified){
                callback(200);
            } else {
                callback(400, new ErrorResponse(575, 'Unknown or already consumed purchase'));
            }
        };

        OkPurchase.updateOne(
            { _id: targetDocId, isConsumed: false },
            { $set: { isConsumed: true } },
            callbackFn
        );
    }

    checkInput();
}

function printError(code){
    return `<?xml version="1.0" encoding="UTF-8"?>` +
        `<ns2:error_response xmlns:ns2='http://api.forticom.com/1.0/'>` +
        `<error_code>${code}</error_code>` +
        `<error_msg>${ERROR_MESSAGES[code]}</error_msg>` +
        `</ns2:error_response>`;
}
function printOkayPayment(){
    return '<callbacks_payment_response xmlns="http://api.forticom.com/1.0/">true</callbacks_payment_response>';
}
function getNextSequenceValue(callback){
    const SEQUENCE_NAME = 'okPurchaseId';

    OkPurchaseCounter.getNextSequenceValue(SEQUENCE_NAME, 1, callback);
}