'use strict';

module.exports = {
    lockResources,
    returnResourcesLock,
    returnResourcesLockPromise,
    validateStoreReceipt,
    checkForBattleDebts,
    runAnotherCustomFunction
};

const goblinBase = require('../../../../index.js').getGoblinBase();

var _ = require('lodash');

var purchaseValidation = require('../../socialNetworksAndInapps/storePurchaseValidation.js'),
    simplePve = require('../../pve/simplePve.js'),
    opResourceLocker = require('../../../generalUtils/opResourceLocker.js'),
    CF_Code = require('../CF_Code.js');

var ErrorResponse = require('../../../objects/ErrorResponse.js');

function lockResources(resources){
    var resolve, reject;

    function doGetLock(){
        let callbackFn = (err, theLock) => {
            if(err){
                reject(err);
            } else {
                resolve(theLock);
            }
        };

        if(Array.isArray(resources)){
            resources = _.uniqBy(resources, e => +e);
        }
        opResourceLocker.getLock(resources, callbackFn);
    }

    return new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
        doGetLock();
    });
}
function returnResourcesLock(theLock, callback){
    opResourceLocker.returnLock(theLock, callback);
}
function returnResourcesLockPromise(theLock){
    var resolve, reject;

    function doReturnResourcesLock(){
        let callbackFn = err => {
            if(err){
                reject(err);
            } else {
                resolve();
            }
        };

        returnResourcesLock(theLock, callbackFn);
    }

    return new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
        doReturnResourcesLock();
    });
}
function validateStoreReceipt(forPid, platform, receiptBody, fake){
    var resolve, reject;

    function tryToValidateNoPersist(){
        let callbackFn = (err, response) => {
            if(err){
                reject(err);
            } else if(response.isValid){
                if(response.duplicate){
                    resolve({ isValid: true, butDuplicated: true });
                } else {
                    resolve({ isValid: true, butDuplicated: false, receiptEntryBody: response.receiptEntry })
                }
            } else {
                resolve({ isValid: false });
            }
        };

        purchaseValidation.tryToValidateNoPersist(forPid, platform, receiptBody, fake, callbackFn);
    }

    return new Promise((_resolve, _reject) => {
        if(!goblinBase.mobileReceiptValidationConfig){
            _reject(new ErrorResponse(918, 'Not implemented'));
        } else {
            resolve = _resolve;
            reject = _reject;
            tryToValidateNoPersist();
        }
    });
}
function checkForBattleDebts(playerPid){
    var resolve, reject;

    function doCheck(){
        let callbackFn = (err, hasDebt) => {
            if (err) {
                reject(err);
            } else {
                resolve(hasDebt);
            }
        };

        simplePve.checkPveBattleDebt(playerPid, callbackFn);
    }

    return new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
        doCheck();
    });
}
function runAnotherCustomFunction(name, humanId, pid, now, allowToAccessProfile, allowToAccessRecords, allowToAccessNotOnlySelf,
                                  allowToMatchmake, isMutation, sessionData, args, clientParams, allowToDefineGlobal, clientPlatform,
                                  clientVersion, sessionObject, theLock, subRunStackDepth){
    var resolve, reject;

    function doRun(){
        if(CF_Code.checkFunctionPresence(name)){
            let callbackFn = (err, response) => {
                if(err){
                    reject(err);
                } else {
                    resolve(response ? response.objectToReturn : response);
                }
            };

            CF_Code.runCustomFunction(name, humanId, pid, now, allowToAccessProfile, allowToAccessRecords, allowToAccessNotOnlySelf,
                allowToMatchmake, isMutation, sessionData, args, clientParams, allowToDefineGlobal, clientPlatform,
                clientVersion, sessionObject, theLock, true, subRunStackDepth, callbackFn
            );
        } else {
            reject(new ErrorResponse(606, `Does not have function named "${name}"`))
        }
    }

    return new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
        doRun();
    });
}