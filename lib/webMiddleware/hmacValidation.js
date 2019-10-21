'use strict';

const HMAC_SIGN_HEADER = 'X-Request-Sign',
    HMAC_REQUEST_SEQUENCE_HEADER = 'X-Req-Seq',
    REQUEST_SEQUENCE_CACHE_TTL_MS = 1000 * 180,
    BOOKING_KEY_HEADER = 'X-Book-Key';

module.exports = {
    theCheck,
    doGameroomHmacCheck,
    doGameroomHmacCheckMiddleware,

    HMAC_SIGN_HEADER,
    HMAC_REQUEST_SEQUENCE_HEADER,
    BOOKING_KEY_HEADER
};

const goblinBase = require('../../index.js').getGoblinBase(),
    log = goblinBase.logsHook;

var _ = require('lodash'),
    crypto = require('crypto');

var opClients = require('../operativeSubsystem/opClients.js');

let ErrorResponse = require('../objects/ErrorResponse.js');

function theCheck(req, res, next){
    function doCheck(){
        let hmacPlatform,
            hmacVersions,
            requestHmac = _.getPropIgnoreCase(req.headers, HMAC_SIGN_HEADER),
            requestSequence = _.parseIntOrNull(_.getPropIgnoreCase(req.headers, HMAC_REQUEST_SEQUENCE_HEADER));

        if(!requestHmac || (_.isNull(requestSequence) && goblinBase.requestOrderValidation)){
            justUnlockSession(400, new ErrorResponse(389, 'HMAC: no hmac or request sequence'));
        } else if(goblinBase.requestOrderValidation &&
                ((req.sessionObject && requestSequence !== req.sessionObject.requestSequence) ||
                (!req.sessionObject && requestSequence !== 0))){
            justUnlockSession(400, new ErrorResponse(390, 'HMAC: sequence mismatch'));
        } else {
            hmacPlatform = goblinBase.platforms.find(e => e.header === req.clientPlatform);
            if(!hmacPlatform){
                return justUnlockSession(400, new ErrorResponse(391, 'HMAC: no data about platform and version'));
            }

            hmacVersions = _.keys(hmacPlatform.hmacSecretsMap);

            let targetHmacRandom = null;
            for(let i = hmacVersions.length - 1 ; i >= 0 ; i--){
                if(_.compareVersionsGte(req.clientVersion, hmacVersions[i])){
                    targetHmacRandom = hmacPlatform.hmacSecretsMap[hmacVersions[i]];
                    break;
                }
            }
            if(targetHmacRandom){
                let hmacSign = '';

                hmacSign += req.raw.originalUrl;
                if (req.body && !_.isEmpty(req.body)) {
                    if(_.isString(req.body)){
                        hmacSign += req.body;
                    } else {
                        try{
                            hmacSign += JSON.stringify(req.body);
                        } catch(err){}
                    }
                }
                if(req.sessionObject){
                    if(goblinBase.requestOrderValidation){
                        if(!_.isNull(requestSequence)){
                            hmacSign += req.sessionObject ? req.sessionObject.requestSequence : 0;
                        }
                        if(req.sessionObject && req.sessionObject.requestSequence > 0 && req.sessionObject.unicorn){
                            hmacSign += req.sessionObject.unicorn;
                        }
                    } else {
                        hmacSign += req.sessionObject.unicorn;
                    }
                } else if(goblinBase.requestOrderValidation){
                    hmacSign += '0';
                }
                hmacSign += targetHmacRandom;

                let mySign = crypto.createHash('sha256').update(Buffer.from(hmacSign), 'binary').digest('hex');

                if(mySign === requestHmac){
                    next();
                } else {
                    justUnlockSession(400, new ErrorResponse(392, 'HMAC: invalid hmac'));
                }
            } else {
                justUnlockSession(400, new ErrorResponse(393, 'HMAC: no appropriate string for your version'));
            }
        }
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 394, err: { code: err.code, command: err.command, message: err.message } });
            }
            res.code(code).send(response);
        };

        if(req.sessionObject){
            opClients.getSessionsClient().getRedis().del(`sexp:${req.sessionObject.unicorn}`, err => callbackFn(err));
        } else {
            res.code(code).send(response);
        }
    }

    if(goblinBase.requestOrderValidation){
        doCheck();
    } else {
        next();
    }
}
function doGameroomHmacCheckMiddleware(req, res, next){
    var bookingKey, requestSequence, prevSequenceValue;

    function checkInput(){
        bookingKey = req.bookingKey || _.getPropIgnoreCase(req.headers, BOOKING_KEY_HEADER);
        requestSequence = _.getPropIgnoreCase(req.headers, HMAC_REQUEST_SEQUENCE_HEADER);
        if(bookingKey && bookingKey.length > 2 && bookingKey.length < 16 && requestSequence){
            req.bookingKey = bookingKey;
            getRequestSequence();
        } else {
            res.code(400).send(new ErrorResponse(395, 'Invalid headers'));
        }
    }
    function getRequestSequence(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 396, err: { code: err.code, command: err.command, message: err.message } });
                res.code(500).send(new ErrorResponse(396, 'OP Error'));
            } else if(response === '-1'){
                res.code(400).send(new ErrorResponse(397, 'HMAC: sequence mismatch'));
            } else {
                prevSequenceValue = +response;
                doCheck();
            }
        };

        opClients.getGameplayRoomClient().getPrevSequenceValue([
            bookingKey, REQUEST_SEQUENCE_CACHE_TTL_MS, requestSequence
        ], callbackFn);
    }
    function doCheck(){
        let callbackFn = err => {
            if(err){
                res.code(400).send(err);
            } else {
                next();
            }
        };

        doGameroomHmacCheck(
            req.raw.originalUrl, req.body, req.headers, parseInt(requestSequence),
            prevSequenceValue, bookingKey,
            req.clientPlatform, req.clientVersion,
            callbackFn
        );
    }

    checkInput();
}
function doGameroomHmacCheck(originalUrl, body, headers, requestSequence, prevSequenceValue, bookingKey,
                             clientPlatform, clientVersion, callback){
    if(!goblinBase.requestOrderValidation){
        callback(null);
    } else {
        let requestHmac = _.getPropIgnoreCase(headers, HMAC_SIGN_HEADER);

        if(!requestHmac || (_.isNull(requestSequence) && _.isNumber(prevSequenceValue))){
            callback(new ErrorResponse(398, 'HMAC: no hmac or request sequence'));
        } else if(_.isNumber(prevSequenceValue) && !isNaN(prevSequenceValue) && requestSequence <= prevSequenceValue){
            callback(new ErrorResponse(399, 'HMAC: sequence mismatch'));
        } else {
            let hmacPlatform, hmacVersions;

            hmacPlatform = goblinBase.platforms.find(e => e.header === clientPlatform);

            if(!hmacPlatform){
                return callback(new ErrorResponse(400, 'HMAC: no data about platform and version'));
            }
            hmacVersions = _.keys(hmacPlatform.hmacSecretsMap);

            let targetHmacRandom = null;
            for(let i = hmacVersions.length - 1 ; i >= 0 ; i--){
                if(_.compareVersionsGte(clientVersion, hmacVersions[i])){
                    targetHmacRandom = hmacPlatform.hmacSecretsMap[hmacVersions[i]];
                    break;
                }
            }
            if(targetHmacRandom){
                let hmacSign = '';

                hmacSign += originalUrl;
                if (body && !_.isEmpty(body)) {
                    if(_.isString(body)){
                        hmacSign += body;
                    } else {
                        try{
                            hmacSign += JSON.stringify(body);
                        } catch(err){}
                    }
                }
                if(_.isNumber(prevSequenceValue)){
                    hmacSign += requestSequence;
                }
                hmacSign += bookingKey;
                hmacSign += targetHmacRandom;

                let mySign = crypto.createHash('sha256').update(Buffer.from(hmacSign), 'binary').digest('hex');

                if(mySign === requestHmac){
                    callback(null);
                } else {
                    callback(new ErrorResponse(401, 'HMAC: invalid hmac'));
                }
            } else {
                callback(new ErrorResponse(402, 'HMAC: no appropriate string for your version'));
            }
        }
    }
}