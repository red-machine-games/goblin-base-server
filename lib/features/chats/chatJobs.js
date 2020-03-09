'use strict';

module.exports = {
    init,
    tryToRefreshChats,

    postMessage,
    postMessageImplementation,
    listMessages,
    listMessagesImplementation,
    fetchMessages,
    fetchMessagesImplementation
};

const goblinBase = require('../../../index.js').getGoblinBase(),
    log = goblinBase.logsHook;

var _ = require('lodash'),
    jsonpack = require('jsonpack'),
    Base64 = require('js-base64').Base64;

var opClients = require('../../operativeSubsystem/opClients.js'),
    sessionKeeper = require('../../webMiddleware/sessionKeeper.js'),
    messagesStoring;

var WebResponseWithCode = require('../../objects/WebResponseWithCode.js'),
    ErrorResponse = require('../../objects/ErrorResponse.js'),
    LongPollingRegistry = require('../../objects/LongPollingRegistry.js'),
    LongPollingWrapper = require('../../objects/LongPollingWrapper.js');

var longPollingConnections;

var lazyNoRefreshChatsTs = 0;

function init(){
    opClients.getChatListenerClient().getRedis().on('message', opHandleMessage);
    opClients.getChatListenerClient().getRedis().subscribe(goblinBase.chatsConfig.channelName);
    longPollingConnections = new LongPollingRegistry();
    messagesStoring = require('./chatMessagesStoring.js');
}
function tryToRefreshChats(now, callback){
    (async () => {
        if(now - lazyNoRefreshChatsTs > goblinBase.chatsConfig.lazyNoRefreshChatsMs){
            lazyNoRefreshChatsTs = now;
            try{
                await opClients.getChatClient().tryToRefreshChatSubscriptionsAsync(
                    [now, goblinBase.chatsConfig.subscriptionRefreshReloadingTimeMs,
                        goblinBase.chatsConfig.subscriptionRefreshBatchSize,
                        goblinBase.chatsConfig.subscriptionLifetime
                    ]
                );
            } catch(err){
                log.error('OP Error', { code: 1100, err: { code: err.code, command: err.command, message: err.message } });
                throw new ErrorResponse(1100, 'OP Error');
            }
            await messagesStoring.tryToRefreshChatMessagesStoring(now);
        }
    })().then(resp => callback(null, resp)).catch(err => callback(err));
}

function opHandleMessage(channel, message){
    var now = _.now();

    async function mapOnAllLpsOfGroup(){
        var [__, theGroup] = message.split('//');

        var lps = longPollingConnections.get(theGroup);
        if(!_.isEmpty(lps)){
            _.each(lps, async (v, k) => await workoutParticularLpConnection(theGroup, k.slice(1), v));
        }
    }
    async function workoutParticularLpConnection(inGroup, humanId, lpConnection){
        var theMessages;

        async function tryToFetchMessages(){
            var response;

            try{
                response = await opClients.getChatClient()
                    .tryToFetchGroupChatMessagesAsync([humanId, inGroup, now, goblinBase.chatsConfig.subscriptionLifetime]);
            } catch(err){
                log.error('OP Error', { code: 1101, err: { code: err.code, command: err.command, message: err.message } });
                return lpConnection.close(500, new ErrorResponse(1101, 'OP Error'));
            }

            if(response === 0){
                return lpConnection.close(200, { mess: [], subscribed: lpConnection.payload('subscribed') });
            } else if(response === -1){
                return await tryToResubscribe();
            }

            theMessages = response.split(',').map(e => jsonpack.unpack(e));
            _.each(theMessages, m => {
                if(m.m){
                    m.m = Base64.decode(m.m);
                }
            });
            await returnResponse();
        }
        async function tryToResubscribe(){
            var resubscriptionNow = _.now();

            try{
                await opClients.getChatClient().tryToRefreshChatSubscriptionsAsync(
                    [resubscriptionNow, goblinBase.chatsConfig.subscriptionRefreshReloadingTimeMs,
                        goblinBase.chatsConfig.subscriptionRefreshBatchSize,
                        goblinBase.chatsConfig.subscriptionLifetime
                    ]
                );
            } catch(err){
                log.error('OP Error', { code: 1102, err: { code: err.code, command: err.command, message: err.message } });
                return lpConnection.close(500, new ErrorResponse(1102, 'OP Error'));
            }

            lpConnection.close(200, { mess: [], subscribed: resubscriptionNow });
        }
        function returnResponse(){
            lpConnection.close(200, { mess: theMessages, subscribed: lpConnection.payload('subscribed') });
        }

        await tryToFetchMessages();
    }

    if(channel === goblinBase.chatsConfig.channelName && longPollingConnections){
        mapOnAllLpsOfGroup().then(_.noop);
    }
}

function postMessage(sessionObject, theMessage, inGroup, noPersist, callback){
    var now = _.now();

    function checkSession(){
        if(sessionObject.pcrd && sessionObject.pid && sessionObject.hid){
            validateTheMessage();
        } else {
            justUnlockSession(400, new ErrorResponse(1103, 'You do not have a profile or should get one'));
        }
    }
    function validateTheMessage(){
        if(!noPersist && !messagesStoring.currentlyIsOkay()){
            return justUnlockSession(503, new ErrorResponse(1104, 'Chat persistence currently unavailable'));
        }
        if(_.isEmpty(theMessage) || Buffer.byteLength(theMessage, 'utf8') > goblinBase.chatsConfig.messageMaxSize){
            return justUnlockSession(400, new ErrorResponse(1105, 'Message value has invalid size'));
        }

        doPost();
    }
    function doPost(){
        postMessageImplementation(now, sessionObject.hid, theMessage, inGroup, noPersist)
            .then(resp => justUnlockSession(resp.code, resp.responseBody))
            .catch(err => {
                if(err instanceof WebResponseWithCode){
                    justUnlockSession(err.code, err.responseBody);
                } else {
                    log.error(err);
                    justUnlockSession(500, new ErrorResponse(1106, 'Some server-side error (logged)'));
                }
            });
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 1107, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkSession();
}
async function postMessageImplementation(now, humanId, theMessage, inGroup, noPersist){
    var messageSuccessfullyBroadcasted,
        newMessageSequenceNum;

    var output;

    async function doTheJob(){
        try{
            await tryToRefreshSubscriptions();
        } catch(err){
            throw err;
        }

        return output;
    }
    async function tryToRefreshSubscriptions(){
        try{
            await opClients.getChatClient().tryToRefreshChatSubscriptionsAsync(
                [
                    now, goblinBase.chatsConfig.subscriptionRefreshReloadingTimeMs,
                    goblinBase.chatsConfig.subscriptionRefreshBatchSize,
                    goblinBase.chatsConfig.subscriptionLifetime
                ]
            );
        } catch(err){
            log.error('OP Error', { code: 1108, err: { code: err.code, command: err.command, message: err.message } });
            throw new WebResponseWithCode(500, new ErrorResponse(1108, 'OP Error'));
        }
        await getNewMessageSequenceNumber();
    }
    async function getNewMessageSequenceNumber(){
        if(!noPersist){
            try{
                newMessageSequenceNum = await messagesStoring.getNewMessageSequenceNumber(inGroup);
            } catch(err){
                throw new WebResponseWithCode(500, err);
            }
        }

        await pushMessage();
    }
    async function pushMessage(){
        try{
            let response = await opClients.getChatClient().pushNewChatMessageAsync([jsonpack.pack({
                m: Base64.encode(theMessage),
                hid: humanId,
                mseq: newMessageSequenceNum,
                cat: now
            }), inGroup, newMessageSequenceNum, goblinBase.chatsConfig.maxInboxPerBucket]);

            messageSuccessfullyBroadcasted = response === 1;
        } catch(err){
            log.error('OP Error', { code: 1109, err: { code: err.code, command: err.command, message: err.message } });
            throw new WebResponseWithCode(500, new ErrorResponse(1109, 'OP Error'));
        }

        await persistMessage();
    }
    async function persistMessage(){
        if(!noPersist){
            try{
                await messagesStoring.persistMessage(theMessage, humanId, inGroup, newMessageSequenceNum, now);
            } catch(err){
                throw new WebResponseWithCode(500, err);
            }
        }

        output = new WebResponseWithCode(200, { broadcasted: messageSuccessfullyBroadcasted });
    }

    return await doTheJob();
}

function listMessages(sessionObject, skip, limit, fromGroup, fromCat, callback){
    function checkSession(){
        if(sessionObject.pcrd && sessionObject.pid && sessionObject.hid){
            checkDatabaseIsOkay();
        } else {
            justUnlockSession(400, new ErrorResponse(1110, 'You do not have a profile or should get one'));
        }
    }
    function checkDatabaseIsOkay(){
        if(!messagesStoring.currentlyIsOkay()){
            return justUnlockSession(503, new ErrorResponse(1111, 'Chat persistence currently unavailable'));
        } else {
            validateInput();
        }
    }
    function validateInput(){
        if(!_.isEmpty(goblinBase.chatsConfig.chatGroupWhitelist) && !goblinBase.chatsConfig.chatGroupWhitelist.includes(fromGroup)){
            return justUnlockSession(400, new ErrorResponse(1112, 'Trying to list messages of forbidden group'));
        }
        if(isNaN(skip) || skip < 0 || skip > Number.MAX_SAFE_INTEGER){
            return justUnlockSession(400, new ErrorResponse(1113, 'Invalid "skip" argument'));
        }
        if(isNaN(limit) || limit < 0 || limit > goblinBase.chatsConfig.maxListingLimitValue){
            return justUnlockSession(400, new ErrorResponse(1114, 'Invalid "limit" argument'));
        }
        if(isNaN(fromCat) || fromCat < 0 || fromCat > Number.MAX_SAFE_INTEGER){
            return justUnlockSession(400, new ErrorResponse(1115, 'Invalid "fromCat" argument'));
        }
        return doList();
    }
    function doList(){
        listMessagesImplementation(skip, limit, fromGroup, fromCat)
            .then(resp => justUnlockSession(resp.code, resp.responseBody))
            .catch(err => {
                if(err instanceof WebResponseWithCode){
                    justUnlockSession(err.code, err.responseBody);
                } else {
                    log.error(err);
                    justUnlockSession(500, new ErrorResponse(1116, 'Some server-side error (logged)'));
                }
            });
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 1117, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkSession();
}
async function listMessagesImplementation(skip, limit, fromGroup, fromCat){
    var theMessages;

    var output;

    async function doTheJob(){
        try{
            await tryToListMessages();
        } catch(err){
            throw err;
        }

        return output;
    }
    async function tryToListMessages(){
        try{
            theMessages = await messagesStoring.listMessages(skip, limit, fromGroup, fromCat);
        } catch(err){
            throw new WebResponseWithCode(500, err);
        }

        output = new WebResponseWithCode(200, { mess: theMessages, subscribed: -1 });
    }

    return await doTheJob();
}

function fetchMessages(sessionObject, fromGroup, theRequest, theResponse, callback){
    function checkSession(){
        if(sessionObject.pcrd && sessionObject.pid && sessionObject.hid){
            validateInput();
        } else {
            justRespond(400, new ErrorResponse(1118, 'You do not have a profile or should get one'));
        }
    }
    function validateInput(){
        if(!_.isEmpty(goblinBase.chatsConfig.chatGroupWhitelist) && !goblinBase.chatsConfig.chatGroupWhitelist.includes(fromGroup)){
            return justRespond(400, new ErrorResponse(1119, 'Trying to list messages of forbidden group'));
        }
        return doFetch();
    }
    function doFetch(){
        fetchMessagesImplementation(sessionObject.hid, fromGroup, new LongPollingWrapper(theRequest, theResponse))
            .then(resp => {
                if(resp){
                    justRespond(resp.code, resp.responseBody);
                }
            })
            .catch(err => {
                if(err instanceof WebResponseWithCode){
                    justRespond(err.code, err.responseBody);
                } else {
                    log.error(err);
                    justRespond(500, new ErrorResponse(1120, 'Some server-side error (logged)'));
                }
            });
    }
    function justRespond(code, response){
        if(code && response){
            callback(code, response);
        }
    }

    checkSession();
}
async function fetchMessagesImplementation(humanId, fromGroup, lpConnection){
    var now = _.now(), subscribed, theMessages;

    var output;

    async function doTheJob(){
        try{
            await tryToRefreshSubscriptions();
        } catch(err){
            throw err;
        }

        return output;
    }
    async function tryToRefreshSubscriptions(){
        try{
            await opClients.getChatClient().tryToRefreshChatSubscriptionsAsync(
                [
                    now, goblinBase.chatsConfig.subscriptionRefreshReloadingTimeMs,
                    goblinBase.chatsConfig.subscriptionRefreshBatchSize,
                    goblinBase.chatsConfig.subscriptionLifetime
                ]
            );
        } catch(err){
            log.error('OP Error', { code: 1121, err: { code: err.code, command: err.command, message: err.message } });
            throw new WebResponseWithCode(500, new ErrorResponse(1121, 'OP Error'));
        }
        await tryToSubscribe();
    }
    async function tryToSubscribe(){
        try{
            let response = await opClients.getChatClient()
                .tryToSubscribeGroupChatMessagesAsync([humanId, fromGroup, now, goblinBase.chatsConfig.subscriptionLifetime]);

            subscribed = (response === 1);
        } catch(err){
            log.error('OP Error', { code: 1122, err: { code: err.code, command: err.command, message: err.message } });
            throw new WebResponseWithCode(500, new ErrorResponse(1122, 'OP Error'));
        }

        await tryToFetchTheseThings();
    }
    async function tryToFetchTheseThings(){
        var response;

        try{
            response = await opClients.getChatClient()
                .tryToFetchGroupChatMessagesAsync([humanId, fromGroup, now, goblinBase.chatsConfig.subscriptionLifetime]);
        } catch(err){
            log.error('OP Error', { code: 1123, err: { code: err.code, command: err.command, message: err.message } });
            throw new WebResponseWithCode(500, new ErrorResponse(1123, 'OP Error'));
        }

        if(response === 0){
            return await addNewLongPollingConnection();
        } else if(response === -1){
            return output = new WebResponseWithCode(400, new ErrorResponse(1124, 'Unexpected no subscription'));
        }

        theMessages = response.split(',').map(e => jsonpack.unpack(e));
        _.each(theMessages, m => {
            if(m.m){
                m.m = Base64.decode(m.m);
            }
        });
        formOutputResponse();
    }
    function formOutputResponse(){
        if(theMessages && theMessages.length){
            _.each(theMessages, m => m.cat = new Date(m.cat).toISOString());
        }
        output = new WebResponseWithCode(200, { mess: theMessages, subscribed: subscribed ? now : -1 });
    }
    function addNewLongPollingConnection(){
        if(longPollingConnections){
            let where = `${fromGroup}.h${humanId}`,
                checkExistentLp = longPollingConnections.get(where);

            if(checkExistentLp){
                checkExistentLp.close(400, new ErrorResponse(1125, 'Closed because of concurrent connection'));
            }

            lpConnection.setColdResponse(200, { mess: [], subscribed: subscribed ? now : -1 }, goblinBase.chatsConfig.longPollingColdResponseAfterMs);
            lpConnection.payload('subscribed', subscribed ? now : -1);
            longPollingConnections.add(lpConnection, where);
        } else {
            return output = new WebResponseWithCode(400, new ErrorResponse(1126, 'No more long polling connections allowed'));
        }
    }

    return await doTheJob();
}