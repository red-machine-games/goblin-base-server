'use strict';

module.exports = {
    removeAllDocuments,
    theGet,
    thePost,
    pvp: {
        theGet: theGetAtGameplayRoom,
        thePost: thePostAtGameplayRoom
    },
    clearCache
};

const TEST_PLATFORM = require('../../lib/webMiddleware/platformPlusVersionCheck.js').PLATFORM_STANDALONE,
    TEST_VERSION = '0.0.0',
    TEST_HMAC_SECRET = 'default',
    DEFAULT_URI_PREFIX = '/api/',
    DEFAULT_GAMEPLAY_ROOM_URI_PREFIX = '/v0/';

var async = require('async'),
    crypto = require('crypto'),
    request = require('request'),
    querystring = require('querystring');

var Account = require('../../lib/persistenceSubsystem/dao/account.js'),
    Battle = require('../../lib/persistenceSubsystem/dao/battle.js'),
    PveBattle = require('../../lib/persistenceSubsystem/dao/pveBattle.js'),
    OkPurchase = require('../../lib/persistenceSubsystem/dao/okPurchase.js'),
    Profile = require('../../lib/persistenceSubsystem/dao/profile.js'),
    Receipt = require('../../lib/persistenceSubsystem/dao/receipt.js'),
    Record = require('../../lib/persistenceSubsystem/dao/record.js'),
    SequenceCo = require('../../lib/persistenceSubsystem/dao/sequenceCounter.js'),
    Ticket = require('../../lib/persistenceSubsystem/dao/ticket.js'),
    VkPurchase = require('../../lib/persistenceSubsystem/dao/vkPurchase.js'),
    AtomicAct = require('../../lib/persistenceSubsystem/dao/atomicAct.js');

var rememberSessionsCounters = {},
    rememberGameplayRoomSequences = {};

function removeAllDocuments(callback){
    async.parallel([
        cb => Account.deleteMany({}, cb),
        cb => Battle.deleteMany({}, cb),
        cb => PveBattle.deleteMany({}, cb),
        cb => OkPurchase.deleteMany({}, cb),
        cb => Profile.deleteMany({}, cb),
        cb => Receipt.deleteMany({}, cb),
        cb => Record.deleteMany({}, cb),
        cb => SequenceCo.deleteMany({}, cb),
        cb => Ticket.deleteMany({}, cb),
        cb => VkPurchase.deleteMany({}, cb),
        cb => AtomicAct.deleteMany({}, cb),
    ], callback);
}
function theGet(host, port, path, query, unicorn, callback, _overridePlatform, _dontIncrementSequence){
    let callbackFn = (err, response, body) => {
        if(body && typeof body !== 'object'){
            try{
                body = JSON.parse(body);
            } catch(__){}
        }
        if(body && body.unicorn && body.unicorn !== unicorn){
            rememberSessionsCounters[body.unicorn] = 1;
            unicorn = body.unicorn;
        }
        if(callback){
            callback(err, response, body, unicorn);
        }
    };

    if(unicorn){
        var reqSeq = _dontIncrementSequence ? rememberSessionsCounters[unicorn] : rememberSessionsCounters[unicorn]++;
    } else {
        reqSeq = 0;
    }
    var uri = `${DEFAULT_URI_PREFIX}${path}`;
    if(query && Object.keys(query).length){
        uri = `${uri}?${querystring.stringify(query)}`
    }
    var hmacSign = `${uri}${reqSeq}${unicorn || ''}${TEST_HMAC_SECRET}`,
        theSign = crypto.createHash('sha256').update(Buffer.from(hmacSign), 'binary').digest('hex'),
        _headers = {
            'X-Platform-Version': `${_overridePlatform || TEST_PLATFORM};${TEST_VERSION}`,
            'X-Req-Seq': reqSeq,
            'X-Request-Sign': theSign
        };
    if(unicorn){
        _headers['X-Unicorn'] = unicorn;
    }

    request.get({ url: `http://${host}:${port}${uri}`, headers: _headers }, callbackFn);
}
function thePost(host, port, path, query, body, unicorn, callback, _overridePlatform){
    let callbackFn = (err, response, body) => {
        if(body && typeof body !== 'object'){
            try{
                body = JSON.parse(body);
            } catch(__){}
        }
        if(body && body.unicorn && body.unicorn !== unicorn){
            rememberSessionsCounters[body.unicorn] = 1;
            unicorn = body.unicorn;
        }
        if(callback){
            callback(err, response, body, unicorn);
        }
    };

    if(unicorn){
        var reqSeq = rememberSessionsCounters[unicorn]++;
    } else {
        reqSeq = 0;
    }
    var uri = `${DEFAULT_URI_PREFIX}${path}`;
    if(query && Object.keys(query).length){
        uri = `${uri}?${querystring.stringify(query)}`
    }

    var hmacSign;
    if(body){
        hmacSign = `${uri}${typeof body === 'object' ? JSON.stringify(body) : body}${reqSeq}${unicorn || ''}${TEST_HMAC_SECRET}`;
    } else {
        hmacSign = `${uri}${reqSeq}${unicorn || ''}${TEST_HMAC_SECRET}`;
    }
    var theSign = crypto.createHash('sha256').update(Buffer.from(hmacSign), 'binary').digest('hex'),
        _headers = {
            'X-Platform-Version': `${_overridePlatform || TEST_PLATFORM};${TEST_VERSION}`,
            'X-Req-Seq': reqSeq,
            'X-Request-Sign': theSign,
        };
    if(unicorn){
        _headers['X-Unicorn'] = unicorn;
    }

    request.post({ url: `http://${host}:${port}${uri}`, json: body, headers: _headers }, callbackFn);
}

function theGetAtGameplayRoom(host, port, path, query, bookingKey, callback, _overridePlatform){
    let callbackFn = (err, response, body) => {
        if(body && typeof body !== 'object'){
            try{
                body = JSON.parse(body);
            } catch(__){}
        }
        if(callback){
            callback(err, response, body);
        }
    };

    var reqSeq;

    if(rememberGameplayRoomSequences[bookingKey]){
        reqSeq = rememberGameplayRoomSequences[bookingKey]++;
    } else {
        reqSeq = 1;
        rememberGameplayRoomSequences[bookingKey] = 2;
    }
    var uri = `${DEFAULT_GAMEPLAY_ROOM_URI_PREFIX}${path}`;
    if(query && Object.keys(query).length){
        uri = `${uri}?${querystring.stringify(query)}`
    }

    var hmacSign = `${uri}${reqSeq}${bookingKey}${TEST_HMAC_SECRET}`,
        theSign = crypto.createHash('sha256').update(Buffer.from(hmacSign), 'binary').digest('hex'),
        _headers = {
            'X-Platform-Version': `${_overridePlatform || TEST_PLATFORM};${TEST_VERSION}`,
            'X-Req-Seq': reqSeq,
            'X-Request-Sign': theSign,
            'X-Book-Key': bookingKey
        };

    request.get({ url: `http://${host}:${port}${uri}`, headers: _headers }, callbackFn);
}
function thePostAtGameplayRoom(host, port, path, query, body, bookingKey, callback, _overridePlatform){
    let callbackFn = (err, response, body) => {
        if(body && typeof body !== 'object'){
            try{
                body = JSON.parse(body);
            } catch(__){}
        }
        if(callback){
            callback(err, response, body);
        }
    };

    var reqSeq;

    if(rememberGameplayRoomSequences[bookingKey]){
        reqSeq = rememberGameplayRoomSequences[bookingKey]++;
    } else {
        reqSeq = 1;
        rememberGameplayRoomSequences[bookingKey] = 2;
    }
    var uri = `${DEFAULT_GAMEPLAY_ROOM_URI_PREFIX}${path}`;
    if(query && Object.keys(query).length){
        uri = `${uri}?${querystring.stringify(query)}`
    }

    var hmacSign;
    if(body){
        hmacSign = `${uri}${typeof body === 'object' ? JSON.stringify(body) : body}${reqSeq}${bookingKey}${TEST_HMAC_SECRET}`;
    } else {
        hmacSign = `${uri}${reqSeq}${bookingKey}${TEST_HMAC_SECRET}`;
    }

    var theSign = crypto.createHash('sha256').update(Buffer.from(hmacSign), 'binary').digest('hex'),
        _headers = {
            'X-Platform-Version': `${_overridePlatform || TEST_PLATFORM};${TEST_VERSION}`,
            'X-Req-Seq': reqSeq,
            'X-Request-Sign': theSign,
            'X-Book-Key': bookingKey
        };

    request.post({ url: `http://${host}:${port}${uri}`, json: body, headers: _headers }, callbackFn);
}

function clearCache(){
    rememberSessionsCounters = {};
    rememberGameplayRoomSequences = {};
}