'use strict';

module.exports = {
    getServiceToken,
    checkToken
};

const goblinBase = require('../../../index.js').getGoblinBase(),
    log = goblinBase.logsHook;

const DEFAULT_TOKEN_LIFETIME_MS = 86400 * 1000;

var _ = require('lodash'),
    request = require('request');

var runMediator = require('../../generalUtils/runMediator.js'),
    ErrorResponse = require('../../objects/ErrorResponse.js');

var theAccessTokenCached,
    tokenLiveUntil;

function getServiceToken(callback){
    var accessTokenResponse;

    function checkTheToken(){
        if(theAccessTokenCached){
            if(tokenLiveUntil < _.now()){
                [theAccessTokenCached, tokenLiveUntil] = [undefined, undefined];
            } else {
                return callback(null, theAccessTokenCached);
            }
        }
        runMediator.runJob(null, requestVk, callback);
    }
    function requestVk(cbfn){
        if(goblinBase.vkCredentials){
            let callbackFn = (err, response, body) => {
                if(err){
                    log.error('VK Connection error', err);
                    cbfn(new ErrorResponse(945, 'VK Connection error'), null);
                } else if(response.statusCode === 200){
                    try{
                        accessTokenResponse = JSON.parse(body);
                    } catch(err){
                        return cbfn(new ErrorResponse(946, 'VK response parsing error'), null);
                    }
                    manageResponse(cbfn);
                } else {
                    cbfn(new ErrorResponse(947, 'VK non-200 response error'), null);
                }
            };

            request({
                url: `${goblinBase.vkCredentials.serviceToken.url}?client_id=${goblinBase.vkCredentials.clientId}` +
                `&client_secret=${goblinBase.vkCredentials.clientSecret}` +
                `&v=${goblinBase.vkCredentials.serviceToken.v}&grant_type=${goblinBase.vkCredentials.serviceToken.grandType}`,
                timeout: goblinBase.vkCredentials.serviceToken.externalApiTimeout
            }, callbackFn);
        } else {
            cbfn(new ErrorResponse(865, 'No VK credentials'), null);
        }
    }
    function manageResponse(cbfn){
        if(accessTokenResponse.access_token){
            let lifetimeMs = accessTokenResponse.expires_in * 1000 || DEFAULT_TOKEN_LIFETIME_MS;
            [theAccessTokenCached, tokenLiveUntil] = [accessTokenResponse.access_token, _.now() + lifetimeMs];
            cbfn(null, theAccessTokenCached);
        } else {
            cbfn(new ErrorResponse(948, 'VK response no service token'));
        }
    }

    checkTheToken();
}
function checkToken(tokenToCheck, serviceToken, callback){
    let callbackFn = (err, response, body) => {
        if(err){
            if(err.message.includes('ETIMEDOUT') || err.message.includes('ESOCKETTIMEDOUT')){
                callback(new ErrorResponse(986, 'VK temporary unreachable. Try again'), 503, null);
            } else {
                log.error('VK Connection Error', err);
                callback(new ErrorResponse(410, 'VK Connection Error'), 503, null);
            }
        } else {
            if(!_.isObject(body)){
                body = JSON.parse(body);
            }
            if((body.success || (body.response && body.response.success)) && !body.error){
                if(body.expire && body.expire <= Math.floor(_.now() / 1000)){
                    callback(new ErrorResponse(936, 'This VK token is rotten'), 401, null);
                } else {
                    callback(null, 200, body.response.user_id);
                }
            } else if(body.error){
                if(body.error.error_code === 15){
                    callback(new ErrorResponse(953, `VK token verification failed. It\'s totally your fault - token you provided is invalid(see error code 15 ${body.error.error_msg})`), 401, null)
                } else {
                    callback(new ErrorResponse(411, 'Problem with VK-side token verification', {
                        errorCode: body.error.error_code,
                        errorMessage: body.error.error_msg
                    }), 401, null);
                }
            } else {
                callback(new ErrorResponse(954, 'Problem with VK-side token verification'), 401, null);
            }
        }
    };

    request({
        url: `https://api.vk.com/method/secure.checkToken?token=${tokenToCheck}` +
        `&access_token=${serviceToken}&client_secret=${goblinBase.vkCredentials.clientSecret}` +
        `&v=${goblinBase.vkCredentials.serviceToken.v}`,
        timeout: goblinBase.vkCredentials.serviceToken.externalApiTimeout
    }, callbackFn);
}