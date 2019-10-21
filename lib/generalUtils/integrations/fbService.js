'use strict';

module.exports = {
    getServiceMarker,
    checkUserToken
};

const goblinBase = require('../../../index.js').getGoblinBase(),
    log = goblinBase.logsHook;

const DEFAULT_MARKER_LIFETIME_MS = 86400 * 1000;

var _ = require('lodash'),
    request = require('request'),
    typeIs = require('type-is'),
    queryString = require('querystring');

var runMediator = require('../../generalUtils/runMediator.js'),
    ErrorResponse = require('../../objects/ErrorResponse.js');

var theAccessMarkerCached,
    markerLiveUntil;

function getServiceMarker(callback){
    var accessMarkerResponse;

    function checkTheMarker(){
        if(theAccessMarkerCached){
            if(markerLiveUntil < _.now()){
                [theAccessMarkerCached, markerLiveUntil] = [undefined, undefined];
            } else {
                return callback(null, theAccessMarkerCached);
            }
        }
        runMediator.runJob('fb-marker', requestFb, callback);
    }
    function requestFb(cbfn){
        if(goblinBase.facebookCredentials){
            let callbackFn = (err, response, body) => {
                if(response){
                }
                if (err) {
                    log.error('FB Connection error', err);
                    cbfn(new ErrorResponse(10, 'FB Connection error'), null);
                } else {
                    if(typeIs(response, ['json'])){
                        if(!_.isObject(body)){
                            accessMarkerResponse = JSON.parse(body);
                        }
                    } else if(typeIs(response, ['text', 'plain'])){
                        accessMarkerResponse = queryString.parse(body);
                    }
                    manageResponse(cbfn);
                }
            };

            request({
                url: `${goblinBase.facebookCredentials.markerApi.url}?client_id=${goblinBase.facebookCredentials.clientId}` +
                `&client_secret=${goblinBase.facebookCredentials.clientSecret}` +
                `&grant_type=${goblinBase.facebookCredentials.markerApi.grandType}`,
                timeout: goblinBase.facebookCredentials.serviceApi.externalApiTimeout
            }, callbackFn);
        } else {
            cbfn(new ErrorResponse(123, 'No FB credentials'), null);
        }
    }
    function manageResponse(cbfn){
        if(accessMarkerResponse && accessMarkerResponse.access_token){
            [theAccessMarkerCached, markerLiveUntil] = [accessMarkerResponse.access_token, _.now() + DEFAULT_MARKER_LIFETIME_MS];
            cbfn(null, theAccessMarkerCached);
        } else {
            cbfn(new ErrorResponse(11, 'No marker in FB response body'), null)
        }
    }

    checkTheMarker();
}
function checkUserToken(targetToken, serviceMarker, callback){
    let callbackFn = (err, response, body) => {
        if(err){
            if(err.message.includes('ETIMEDOUT') || err.message.includes('ESOCKETTIMEDOUT')){
                callback(new ErrorResponse(988, 'Facebook temporary unreachable. Try again'), 503, null);
            } else {
                log.error('Facebook Connection Error', err);
                callback(new ErrorResponse(412, 'Facebook Connection Error'), 503, null);
            }
        } else {
            try{
                if(!_.isObject(body)){
                    body = JSON.parse(body);
                }
            } catch(e){
                body = queryString.parse(body);
            }
            if(body.error || body.data.error || !body.data.is_valid){
                callback(new ErrorResponse(413, 'Facebook OAuth validation failed'), 401, null);
            } else {
                callback(null, 200, body.data.user_id);
            }
        }
    };

    request({
        url: `${goblinBase.facebookCredentials.serviceApi.url}debug_token?`
            + `input_token=${targetToken}&access_token=${serviceMarker}`,
        timeout: goblinBase.facebookCredentials.serviceApi.externalApiTimeout
    }, callbackFn);
}