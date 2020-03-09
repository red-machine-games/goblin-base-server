'use strict';

module.exports = {
    tryToRefreshChatMessagesStoring,
    currentlyIsOkay,

    getNewMessageSequenceNumber,
    persistMessage,
    listMessages
};

const goblinBase = require('../../../index.js').getGoblinBase(),
    log = goblinBase.logsHook;

const MESSAGE_COUNTER_HEADER = inGroup => `chatMsg-${inGroup}`;

var mongo = require('../../persistenceSubsystem/setupMongodb.js'),
    opClients = require('../../operativeSubsystem/opClients.js');

var MessageSequenceCounter = require('../../persistenceSubsystem/dao/sequenceCounter.js'),
    ChatMessage = require('../../persistenceSubsystem/dao/chatMessage.js'),
    ChatGroup = require('../../persistenceSubsystem/dao/chatGroup.js'),
    ErrorResponse = require('../../objects/ErrorResponse.js');

async function tryToRefreshChatMessagesStoring(now){
    var docIdsToRemove;

    async function tryLockRefresh(){
        try{
            var response = await opClients.getChatMessagingClient()
                .tryToLockRefreshChatMessagesStoringAsync([now, goblinBase.chatsConfig.refreshPackageTimeout]);
        } catch(err){
            log.error('OP Error', { code: 9999, err: { code: err.code, command: err.command, message: err.message } });
            throw err;
        }

        if(response === '1'){
            await getBatchOfOutdatedDocuments();
        }
    }
    async function getBatchOfOutdatedDocuments(){
        try{
            let response = await ChatMessage.find(
                { cat: { $lt: now - goblinBase.chatsConfig.maxMessageTtlMs } },
                { projection: { _id: 1 }, limit: goblinBase.chatsConfig.refreshMaxBatchSize }
            ).toArray();
            docIdsToRemove = response.map(e => e._id);
        } catch(err){
            log.error('Database Error', { code: 9999, err: { message: err.message, name: err.name } });
            throw new ErrorResponse(9999, 'Database Error');
        }

        if(docIdsToRemove.length){
            await removeOutdatedDocuments();
        }
    }
    async function removeOutdatedDocuments(){
        try{
            await ChatMessage.deleteMany({ _id: { $in: docIdsToRemove } });
            log.info(`removeOutdatedDocuments @ tryToRefreshChatMessagesStoring @ chatMessagesStoring.js... REMOVED ${docIdsToRemove.length} OUTDATED DOCUMENTS`);
        } catch(err){
            log.error('Database Error', { code: 9999, err: { message: err.message, name: err.name } });
            throw new ErrorResponse(9999, 'Database Error');
        }
    }

    if(currentlyIsOkay()){
        await tryLockRefresh();
    }
}
function currentlyIsOkay(){
    return mongo.dbIsConnected();
}

async function getNewMessageSequenceNumber(inGroup){
    try{
        return await MessageSequenceCounter.getNextSequenceValue(MESSAGE_COUNTER_HEADER(inGroup), 1);
    } catch(err){
        log.error('Database Error', { code: 9999, err: { message: err.message, name: err.name } });
        throw new ErrorResponse(9999, 'Database Error');
    }
}
async function persistMessage(theMessage, byHumanId, inGroup, messageSequenceNum, messageCat){
    var groupDocId;

    async function getOrCreateNewGroup(){
        try{
            let result = await ChatGroup.findOneAndUpdate(
                { head: inGroup },
                { $setOnInsert: { head: inGroup } },
                { upsert: true, projection: { _id: 1 } }
            );
            groupDocId = (result.lastErrorObject.updatedExisting)
                ? result.value._id
                : result.lastErrorObject.upserted;
        } catch(err){
            log.error('Database Error', { code: 9999, err: { message: err.message, name: err.name } });
            throw new ErrorResponse(9999, 'Database Error');
        }

        await doPersist();
    }
    async function doPersist(){
        try{
            await ChatMessage.createNew({
                grp: groupDocId,
                m: theMessage,
                author: byHumanId,
                mseq: messageSequenceNum,
                cat: messageCat
            });
        } catch(err){
            log.error('Database Error', { code: 9999, err: { message: err.message, name: err.name } });
            throw new ErrorResponse(9999, 'Database Error');
        }
    }

    await getOrCreateNewGroup();
}
async function listMessages(skip, limit, fromGroup, fromCat){
    var groupDocId, fromSeq, theListing;

    var output;

    async function doTheJob(){
        try{
            await getTargetGroupId();
        } catch(err){
            throw err;
        }

        return output;
    }
    async function getTargetGroupId(){
        try{
            let responseDoc = await ChatGroup.findOne(
                { head: fromGroup },
                { $projection: { _id: 1 } }
            );
            if(responseDoc){
                groupDocId = responseDoc._id;
            }
        } catch(err){
            log.error('Database Error', { code: 9999, err: { message: err.message, name: err.name } });
            throw new ErrorResponse(9999, 'Database Error');
        }

        if(groupDocId){
            await getMostRecentMessage();
        } else {
            theListing = [];
            formResponse();
        }
    }
    async function getMostRecentMessage(){
        try{
            var doc = await ChatMessage.findOne(
                { grp: groupDocId, cat: { $lte: fromCat } },
                { projection: { _id: 0, mseq: 1 }, sort: { mseq: -1 } }
            );
        } catch(err){
            log.error('Database Error', { code: 9999, err: { message: err.message, name: err.name } });
            throw new ErrorResponse(9999, 'Database Error');
        }

        if(doc){
            fromSeq = Math.max(doc.mseq - skip, 1);
            await doList();
        } else {
            theListing = [];
            formResponse();
        }
    }
    async function doList(){
        try{
            theListing = await ChatMessage.find(
                { grp: groupDocId, mseq: { $lte: fromSeq } },
                { projection: { _id: 0, m: 1, author: 1, mseq: 1, cat: 1 }, sort: { mseq: -1 }, limit }
            ).toArray();
        } catch(err){
            log.error('Database Error', { code: 9999, err: { message: err.message, name: err.name } });
            throw new ErrorResponse(9999, 'Database Error');
        }

        formResponse();
    }
    function formResponse(){
        output = theListing.map(e => { return {
            m: e.m,
            subcid: e.author,
            mseq: e.mseq,
            cat: e.cat
        }});
    }

    return await doTheJob();
}