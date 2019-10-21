'use strict';

module.exports = {
    matchPlayerOpponent
};

const goblinBase = require('../../../../index.js').getGoblinBase();

var _ = require('lodash');

var matchmaking = require('../../matchmaking/matchmaking.js');

var ErrorResponse = require('../../../objects/ErrorResponse.js');

async function matchPlayerOpponent(playerPid, segment, strategy, ranges, nRandom, rememberMatchForMs, fakeProfileAccess){
    var resolve, reject;

    function maybeFakeAccess(){
        if(fakeProfileAccess){
            resolve({ humanId: _.random(1, 1000), publicProfileData: {} });
        } else {
            doMatchPlayerOpponent();
        }
    }
    function doMatchPlayerOpponent(){
        let callbackFn = (err, code, response) => {
            if(err){
                if(code === 404){
                    resolve(null);
                } else {
                    reject(err);
                }
            } else {
                resolve(response);
            }
        };

        matchmaking.matchPlayerOpponentImplementation(
            playerPid, segment, strategy, { rgs: ranges, nran: nRandom }, rememberMatchForMs, false, callbackFn
        );
    }

    return new Promise((_resolve, _reject) => {
        if(!goblinBase.leaderboardsConfig || !goblinBase.matchmakingConfig){
            reject(new ErrorResponse(888, 'Not implemented'));
        } else {
            resolve = _resolve;
            reject = _reject;
            maybeFakeAccess();
        }
    });
}