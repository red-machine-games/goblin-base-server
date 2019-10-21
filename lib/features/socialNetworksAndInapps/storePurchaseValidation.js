'use strict';

module.exports = {
    init,
    isValidSeparateRoute,
    tryToValidateNoPersist
};

const goblinBase = require('../../../index.js').getGoblinBase(),
    log = goblinBase.logsHook;

const PLATFORM_IOS = require('../../webMiddleware/platformPlusVersionCheck.js').PLATFORM_IOS,
    PLATFORM_ANDROID = require('../../webMiddleware/platformPlusVersionCheck.js').PLATFORM_ANDROID;

const DUPLICATE_KEY_ERROR = 'E11000 duplicate key error',
    MUR_MUR_SEED = 36902382,
    HASH_COLLISION_DOS_LIMIT = 21,
    DEFAULT_API_TIMEOUT = 15 * 1000;

var _ = require('lodash'),
    iap = require('in-app-purchase'),
    murmurhash = require('murmurhash'),
    ObjectID = require('mongodb').ObjectID;

var ErrorResponse = require('../../objects/ErrorResponse');

var Receipt = require('../../persistenceSubsystem/dao/receipt.js');

var inapValidationIsUp = false;

function init(callback){
    let callbackFn = err => {
        if(err){
            log.error(err);
            callback(new ErrorResponse(14, 'Setup IAP error'));
        } else {
            inapValidationIsUp = true;
            callback(null);
        }
    };

    var _theConfigsToProvideInto = {
        requestDefaults: { timeout: DEFAULT_API_TIMEOUT },
        test: goblinBase.mobileReceiptValidationConfig.forceSandbox,
        verbose: goblinBase.mobileReceiptValidationConfig.verbose
    };
    if(goblinBase.appStoreCredentials && goblinBase.appStoreCredentials.isUp){
        _theConfigsToProvideInto.appleExcludeOldTransactions = goblinBase.mobileReceiptValidationConfig.appleExcludeOldTransactions;
        _theConfigsToProvideInto.applePassword = goblinBase.appStoreCredentials.applePassword
    }
    if(goblinBase.googlePlayCredentials && goblinBase.googlePlayCredentials.isUp){
        if(goblinBase.googlePlayCredentials.googleServiceAccount){
            _theConfigsToProvideInto.googleServiceAccount = goblinBase.googlePlayCredentials.googleServiceAccount;
        } else {
            _theConfigsToProvideInto.googlePublicKeyStrSandBox = goblinBase.googlePlayCredentials.googlePublicKeyStrSandBox;
            _theConfigsToProvideInto.googlePublicKeyStrLive = goblinBase.googlePlayCredentials.googlePublicKeyStrLive;
        }
    }

    iap.config(_theConfigsToProvideInto);
    iap.setup(callbackFn);
}
function isValidSeparateRoute(pid, platform, receipt, callback){
    validationImplementation(pid, platform, receipt, _.now(), false, callback);
}
function tryToValidateNoPersist(pid, platform, receipt, fake, callback){
    let callbackFn = (code, response) => {
        if(code !== 200){
            callback(response, null);
        } else {
            callback(null, response);
        }
    };

    validationImplementation(pid, platform, receipt, null, fake, callbackFn);
}

function validationDecorator(platform, receipt, forceFake, callback){
    if(forceFake || goblinBase.mobileReceiptValidationConfig.imitate){
        let out = { isValid: goblinBase.mobileReceiptValidationConfig.imitate ? goblinBase.mobileReceiptValidationConfig.imitate.isValid : true };
        if(out.isValid){
            if(platform === iap.APPLE){
                out.data = [{ bundleId: goblinBase.appStoreCredentials.appStoreBundleId }];
            } else if(platform === iap.GOOGLE){
                out.data = [{ packageName: goblinBase.googlePlayCredentials.googlePlayBundleId }];
            }
        }
        callback(null, out);
    } else {
        let callbackFn = (err, result) => {
            if(err){
                callback(err, null);
            } else {
                let isValid = iap.isValidated(result),
                    out = { isValid };
                if(isValid && !_.isEmpty(result)){
                    out.data = iap.getPurchaseData(result);
                }
                callback(null, out);
            }
        };

        iap.validate(receipt, callbackFn);
    }
}

function validationImplementation(pid, platform, receipt, persistAtNow, fake, callback) {
    let receiptCrc;

    function checkInit(){
        if(inapValidationIsUp){
            tryToGetReceipt();
        } else {
            callback(400, new ErrorResponse(928, 'No validation configs'));
        }
    }
    function tryToGetReceipt(){
        let callbackFn = (err, docs) => {
            if (err) {
                log.error('Mongodb Error', { code: 279, err: { message: err.message, name: err.name } });
                callback(500, new ErrorResponse(279, 'Database Error'));
            } else {
                switch(docs.length){
                    case 2: tryToGetReceiptWithCollision(); break;
                    case 1: callback(200, { isValid: true, duplicate: true }); break;
                    case 0: selectValidation(); break;
                }
            }
        };

        if(!_.isString(receipt)){
            if(_.isObject(receipt)){
                receipt = JSON.stringify(receipt);
            } else {
                receipt = String(receipt);
            }
        }
        if(platform !== PLATFORM_IOS && platform !== PLATFORM_ANDROID && !fake){
            return callback(400, new ErrorResponse(280, 'Undefined platform'));
        }
        if(!_.isString(receipt)){
            receipt = JSON.stringify(receipt);
        }
        receiptCrc = murmurhash.v3(receipt, MUR_MUR_SEED);

        Receipt.find({ receiptCrc }, { limit: 2 }).toArray(callbackFn);
    }
    function tryToGetReceiptWithCollision(){
        let callbackFn = (err, docs) => {
            if (err) {
                log.error('Mongodb Error', { code: 281, err: { message: err.message, name: err.name } });
                callback(500, new ErrorResponse(281, 'Database Error'));
            } else {
                if(docs.length === HASH_COLLISION_DOS_LIMIT){
                    log.warn(`Receipts hash collision Dos maybe (receipt hash = ${receiptCrc})`);
                } else {
                    for(let i = 0 ; i < docs.length ; i++){
                        let doc = docs[i];
                        if(doc.receipt === receipt && doc.receiptCrc === receiptCrc){
                            return callback(200, { isValid: true, duplicate: true });
                        }
                    }
                }
                selectValidation();
            }
        };

        Receipt.find({ receipt }, { limit: HASH_COLLISION_DOS_LIMIT }).toArray(callbackFn);
    }
    function selectValidation() {
        if (platform === PLATFORM_IOS) {
            iosValidation();
        } else if (platform === PLATFORM_ANDROID) {
            androidValidation();
        } else {
            callback(400, new ErrorResponse(282, 'Undefined platform'));
        }
    }
    function iosValidation() {
        let callbackFn = (err, result) => {
            if (err) {
                log.error('IAP validation Error', { code: 283, err: { message: err.message, name: err.name, pid, receipt: receipt } });
                callback(400, new ErrorResponse(283, 'IAP validation Error', err.message));
            } else if (result.isValid) {
                if (!result.data) {
                    callback(400, new ErrorResponse(284, 'Empty result of validation'));
                } else {
                    let correctApp = true;
                    for (let i = 0 ; i < result.data.length ; i++) {
                        if (result.data[i].bundleId !== goblinBase.appStoreCredentials.appStoreBundleId) {
                            correctApp = false;
                            break;
                        }
                    }
                    if (correctApp) {
                        saveReceipt();
                    } else {
                        callback(400, new ErrorResponse(285, 'Wrong bundleId', result.data[0].bundleId));
                    }
                }
            } else {
                callback(200, { isValid: false, duplicate: false });
            }
        };

        if(!_.isString(receipt)){
            if(_.isObject(receipt)){
                receipt = JSON.stringify(receipt);
            } else {
                receipt = String(receipt);
            }
        }
        validationDecorator(iap.APPLE, receipt, fake, callbackFn);
    }
    function androidValidation() {
        let callbackFn = (err, result) => {
            if (err) {
                log.error('IAP validation Error', { code: 286, err: { message: err.message, name: err.name, pid, receipt: JSON.stringify(receipt) } });
                callback(400, new ErrorResponse(286, 'IAP validation Error', err.message));
            } else if (result.isValid) {
                if (!result.data) {
                    callback(400, new ErrorResponse(287, 'Empty result of validation'));
                } else {
                    let correctApp = true;
                    for (let i = 0 ; i < result.data.length ; i++) {
                        if (result.data[i].packageName !== goblinBase.googlePlayCredentials.googlePlayBundleId) {
                            correctApp = false;
                            break;
                        }
                    }
                    if (correctApp) {
                        saveReceipt();
                    } else {
                        callback(400, new ErrorResponse(288, 'Wrong orderId', result.data[0].packageName));
                    }
                }
            } else {
                callback(200, { isValid: false, duplicate: false });
            }
        };

        if(!_.isObject(receipt)){
            try{
                receipt = JSON.parse(receipt);
            } catch(err){
                return callback(400, new ErrorResponse(429, 'Does not looks like a receipt'));
            }
        }
        validationDecorator(iap.GOOGLE, receipt, fake, callbackFn);
    }
    function saveReceipt() {
        if(!_.isString(receipt)){
            if(_.isObject(receipt)){
                receipt = JSON.stringify(receipt);
            } else {
                receipt = String(receipt);
            }
        }

        var receiptEntry = { receiptCrc, receipt, cat: persistAtNow || _.now() };
        if(persistAtNow){
            let callbackFn = err => {
                if(err){
                    if(err.code === 11000 && err.message.startsWith(DUPLICATE_KEY_ERROR)){
                        callback(200, { isValid: true, duplicate: true });
                    } else {
                        log.error('Mongodb Error', { code: 919, err: { message: err.message, name: err.name } });
                        callback(500, new ErrorResponse(919, 'Database Error'));
                    }
                } else {
                    callback(200, { isValid: true, duplicate: false, persisted: true });
                }
            };

            receiptEntry.pid = _.isString(pid) ? ObjectID(pid) : pid;
            Receipt.createNew(receiptEntry, callbackFn);
        } else {
            receiptEntry.pid = pid;
            callback(200, { isValid: true, duplicate: false, persisted: false, receiptEntry });
        }
    }

    checkInit();
}