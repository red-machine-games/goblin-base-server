'use strict';

module.exports = {
    checkToken
};

const goblinBase = require('../../../index.js').getGoblinBase(),
    log = goblinBase.logsHook;

const CHECK_TOKEN_METHOD = 'users.getCurrentUser',
    CHECK_TOKEN_FIELD = 'UID',
    CHECK_TOKEN_FORMAT = 'json';

var _ = require('lodash'),
    request = require('request');

var ErrorResponse = require('../../objects/ErrorResponse.js');

function checkToken(targetToken, callback){
    let callbackFn = (err, response, body) => {
        if(err){
            if(err.message.includes('ETIMEDOUT') || err.message.includes('ESOCKETTIMEDOUT')){
                callback(new ErrorResponse(987, 'OK temporary unreachable. Try again'), 503, null);
            } else {
                log.error('OK Connection error', err);
                callback(new ErrorResponse(937, 'OK Connection error'), 503, null);
            }
        } else if(response.statusCode === 200){
            try{
                body = JSON.parse(body);
            } catch(err){
                return callback(new ErrorResponse(938, 'OK response parsing error'), 503, null);
            }
            if(body.uid){
                callback(null, 200, `${body.uid}`);
            } else {
                callback(new ErrorResponse(939, `OK error: ${body.error_msg}`), 503, null);
            }
        } else {
            callback(new ErrorResponse(940, 'OK non-200 response error'), 503, null);
        }
    };

    var secretKeyHash = crypto.createHash('md5').update(targetToken + goblinBase.okCredentials.applicationSecretKey).digest('hex'),
        theSig = crypto.createHash('md5').update(
            `application_key=${goblinBase.okCredentials.applicationPublicKey}` +
            `fields=${CHECK_TOKEN_FIELD}format=${CHECK_TOKEN_FORMAT}method=${CHECK_TOKEN_METHOD}${secretKeyHash}`
        ).digest('hex'),
        uri = `application_key=${goblinBase.okCredentials.applicationPublicKey}`
            + `&fields=${CHECK_TOKEN_FIELD}&format=${CHECK_TOKEN_FORMAT}&method=${CHECK_TOKEN_METHOD}&sig=${theSig}`
            + `&access_token=${targetToken}`;

    request({
        url: `${goblinBase.okCredentials.serviceApi.url}${uri}`,
        timeout: goblinBase.okCredentials.serviceApi.externalApiTimeout
    }, callbackFn);
}