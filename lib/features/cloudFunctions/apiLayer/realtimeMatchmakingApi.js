'use strict';

module.exports = {
    checkPvpNoSearch,
    dropMatchmaking,
    searchPvpOpponent,
    stopSearchingForAnyPvpOpponent,
    matchWithHandSelectedOpponent,
    acceptPvpMatch,
    waitForPvpOpponentToAccept,
    declinePvpMatch
};

var matchmaking = require('../../matchmaking/matchmaking.js');

async function checkPvpNoSearch(targetPid, now){
    var resolve, reject;

    function doCheckPveNoSearch(){
        let callbackFn = (code, response) => {
            if(code !== 200){
                reject(response);
            } else {
                resolve(response);
            }
        };

        matchmaking.justCheckBattleNoSearchImplementation(targetPid, now, callbackFn);
    }

    return new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
        doCheckPveNoSearch();
    });
}
async function dropMatchmaking(targetPid, now){
    var resolve, reject;

    function doDropMatchmaking(){
        let callbackFn = (code, response) => {
            if(code !== 200){
                reject(response);
            } else {
                resolve(response);
            }
        };

        matchmaking.dropMatchmakingImplementation(targetPid, now, callbackFn);
    }

    return new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
        doDropMatchmaking();
    });
}
async function searchPvpOpponent(targetPid, now, segment, strategy, ranges, nRandom){
    var resolve, reject;

    function doSearchPvpOpponent(){
        let callbackFn = (code, response) => {
            if(code !== 200){
                reject(response);
            } else {
                resolve(response);
            }
        };

        matchmaking.searchForOpponentOverallImplementation(
            now, true, undefined, targetPid, undefined, segment, strategy, { rgs: ranges, nran: nRandom },
            callbackFn
        );
    }

    return new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
        doSearchPvpOpponent();
    });
}
async function stopSearchingForAnyPvpOpponent(targetPid, now){
    var resolve, reject;

    function doStopSearchingForAnyPvpOpponent(){
        let callbackFn = (code, response) => {
            if(code !== 200){
                reject(response);
            } else {
                resolve(response);
            }
        };

        matchmaking.stopSearchingForOpponentImplementation(now, targetPid, callbackFn);
    }

    return new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
        doStopSearchingForAnyPvpOpponent();
    });
}
async function matchWithHandSelectedOpponent(targetPid, targetHumanId, humanIdThatYouAreSelected, now){
    var resolve, reject;

    function doMatch(){
        let callbackFn = (code, response) => {
            if(code !== 200){
                reject(response);
            } else {
                resolve(response);
            }
        };

        matchmaking.matchWithHandSelectedOpponentImplementation(
            now, targetPid, targetHumanId, humanIdThatYouAreSelected, callbackFn
        );
    }

    return new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
        doMatch();
    });
}
async function acceptPvpMatch(targetPid, now){
    var resolve, reject;

    function doAcceptPvpMatch(){
        let callbackFn = (code, response) => {
            if(code !== 200){
                reject(response);
            } else {
                resolve(response);
            }
        };

        matchmaking.acceptMatchImplementation(now, targetPid, callbackFn);
    }

    return new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
        doAcceptPvpMatch();
    });
}
async function waitForPvpOpponentToAccept(targetPid, now){
    var resolve, reject;

    function doWaitForPvpOpponentToAccept(){
        let callbackFn = (code, response) => {
            if(code !== 200){
                reject(response);
            } else {
                resolve(response);
            }
        };

        matchmaking.waitForOpponentToAcceptImplementation(now, true, undefined, targetPid, callbackFn);
    }

    return new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
        doWaitForPvpOpponentToAccept();
    });
}
async function declinePvpMatch(targetPid, now){
    var resolve, reject;

    function doDeclinePvpMatch(){
        let callbackFn = (code, response) => {
            if(code !== 200){
                reject(response);
            } else {
                resolve(response);
            }
        };

        matchmaking.declineMatchImplementation(now, targetPid, callbackFn);
    }

    return new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
        doDeclinePvpMatch();
    });
}