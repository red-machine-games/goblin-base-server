'use strict';

module.exports = {
    listSendedTickets,
    listReceivedTickets,

    sendTicket,
    sendTicketVk,
    sendTicketOk,
    sendTicketFb,

    confirmTicket,
    confirmTicketVk,
    confirmTicketOk,
    confirmTicketFb,

    rejectTicket,
    rejectTicketVk,
    rejectTicketOk,
    rejectTicketFb,

    dischargeTicket,    // Free ticket without response
    dismissTicket,      // Free ticket with negative response
    releaseTicket       // Free ticket with positive response
};

const goblinBase = require('../../../index.js').getGoblinBase(),
    log = goblinBase.logsHook;

var _ = require('lodash'),
    ObjectID = require('mongodb').ObjectID;

var ErrorResponse = require('../../objects/ErrorResponse');

var sessionKeeper = require('../../webMiddleware/sessionKeeper.js');

var Profile = require('../../persistenceSubsystem/dao/profile.js'),
    Ticket = require('../../persistenceSubsystem/dao/ticket.js'),
    TicketCounter = require('../../persistenceSubsystem/dao/sequenceCounter.js');

function listSendedTickets(sessionObject, skip, limit, callback) {
    function checkInput(){
        skip = Math.max(0, skip) || 0;
        limit = Math.min(20, limit) || 20;
        checkSession();
    }
    function checkSession(){
        if(sessionObject.aid){
            if(sessionObject.pcrd && sessionObject.pid && sessionObject.hid){
                findTickets();
            } else {
                justUnlockSession(400, new ErrorResponse(206, 'You do not have a profile or should get one'));
            }
        } else {
            justUnlockSession(500, new ErrorResponse(207, 'Malformed session'));
        }
    }
    function findTickets() {
        let callbackFn = (err, tickets) => {
            if (err) {
                log.error('Mongodb Error', { code: 208, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(208, 'Database Error'));
            } else if (tickets && !_.isEmpty(tickets)) {
                tickets = tickets.map(e => {
                    e.cat = _.isoToTimestamp(e._id.getTimestamp());
                    delete e._id;
                    delete e.receiver;
                    delete e.sender;
                    return e;
                });
                justUnlockSession(200, tickets);
            } else {
                justUnlockSession(200, []);
            }
        };

        Ticket.find(
            { sender: new ObjectID(sessionObject.pid), ttlIndex: { $gt: new Date(_.now() - goblinBase.ticketsConfig.ticketLifetime) } },
            { projection: { ttlIndex: 0 }, sort: { _id: -1 }, skip, limit }
        ).toArray(callbackFn);
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 209, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkInput();
}
function listReceivedTickets(sessionObject, skip, limit, callback) {
    var query;

    function checkInput(){
        skip = Math.max(0, skip) || 0;
        limit = Math.min(20, limit) || 20;
        checkSession();
    }
    function checkSession(){
        if(sessionObject.aid){
            if(sessionObject.pcrd && sessionObject.pid && sessionObject.hid){
                setQuery();
            } else {
                justUnlockSession(400, new ErrorResponse(210, 'You do not have a profile or should get one'));
            }
        } else {
            justUnlockSession(500, new ErrorResponse(211, 'Malformed session'));
        }
    }
    function setQuery() {
        if (!sessionObject.pid && !sessionObject.vkId && !sessionObject.fbId && !sessionObject.okId) {
            justUnlockSession(400, new ErrorResponse(212, 'No inputs'));
        } else {
            if(sessionObject.pid && !sessionObject.vkId && !sessionObject.fbId && !sessionObject.okId){
                query = { receiver: new ObjectID(sessionObject.pid) };
            } else if(sessionObject.pid && sessionObject.vkId){
                query = { $or: [{ receiver: new ObjectID(sessionObject.pid) }, { receiverVk: sessionObject.vkId }] };
            } else if(sessionObject.pid && sessionObject.fbId){
                query = { $or: [{ receiver: new ObjectID(sessionObject.pid) }, { receiverFb: sessionObject.fbId }] };
            } else if(sessionObject.pid && sessionObject.okId){
                query = { $or: [{ receiver: new ObjectID(sessionObject.pid) }, { receiverOk: sessionObject.okId }] };
            }
            findTickets();
        }
    }
    function findTickets() {
        let callbackFn = (err, tickets) => {
            if (err) {
                log.error('Mongodb Error', { code: 213, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(213, 'Database Error'));
            } else if (tickets && !_.isEmpty(tickets)) {
                tickets = tickets.map(e => {
                    e.cat = _.isoToTimestamp(e._id.getTimestamp());
                    delete e._id;
                    delete e.receiver;
                    delete e.sender;
                    delete e.cb;
                    return e;
                });
                justUnlockSession(200, tickets);
            } else {
                justUnlockSession(200, []);
            }
        };

        query.sat = { $exists: false };
        query.ttlIndex = { $gt: new Date(_.now() - goblinBase.ticketsConfig.ticketLifetime) };
        Ticket.find(query, { projection: { ttlIndex: 0 }, sort: { _id: -1 }, skip, limit }).toArray(callbackFn);
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 214, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkInput();
}
function sendTicket(sessionObject, receiverId, ticketHead, ticketPayload, ticketCallback, callback) {
    let targetProfileId, targetProfileHumanId, ticketId;

    function checkInput(){
        if(receiverId && _.isNumber(receiverId) && ticketHead && _.isString(ticketHead)
            && ticketHead.length <= 128 && _.isPlainObject(ticketPayload) && _.isBoolean(ticketCallback)){
            checkSession();
        } else {

            justUnlockSession(400, new ErrorResponse(985, 'Invalid input arguments'));
        }
    }
    function checkSession(){
        if(sessionObject.aid){
            if(sessionObject.pcrd && sessionObject.pid && sessionObject.hid){
                getReceiver();
            } else {
                justUnlockSession(400, new ErrorResponse(215, 'You do not have a profile or should get one'));
            }
        } else {
            justUnlockSession(500, new ErrorResponse(216, 'Malformed session'));
        }
    }
    function getReceiver(){
        let callbackFn = (err, docFound) => {
            if(err){
                log.error('Mongodb Error', { code: 217, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(217, 'Database Error'));
            } else if(!docFound){
                justUnlockSession(400, new ErrorResponse(218, 'Unknown target player'));
            } else {
                targetProfileId = docFound._id.toString();
                targetProfileHumanId = docFound.humanId;
                if(targetProfileId === sessionObject.pid){
                    justUnlockSession(400, new ErrorResponse(219, 'Your are trying to send ticket to yourself'));
                } else {
                    getTicketId();
                }
            }
        };

        Profile.findOne({ humanId: parseInt(receiverId) }, { projection: { _id: 1, humanId: 1 } }, callbackFn);
    }
    function getTicketId() {
        let callbackFn = (err, sequenceValue) => {
            if(err){
                justUnlockSession(500, err);
            } else {
                ticketId = sequenceValue;
                addTicket();
            }
        };

        getNextSequenceValue(callbackFn);
    }
    function addTicket() {
        let callbackFn = (err, ticketCreated) => {
            if (err) {
                log.error('Mongodb Error', { code: 220, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(220, 'Database Error'));
            } else {
                delete ticketCreated._id;
                delete ticketCreated.receiver;
                delete ticketCreated.sender;
                delete ticketCreated.cb;
                delete ticketCreated.cat;
                delete ticketCreated.ttlIndex;
                justUnlockSession(200, ticketCreated);
            }
        };

        Ticket.createNew({
            tid: ticketId,
            sender: new ObjectID(sessionObject.pid),
            receiver: new ObjectID(targetProfileId),
            senderId: parseInt(sessionObject.hid),
            receiverId: targetProfileHumanId,
            ticketHead: ticketHead,
            payload: ticketPayload,
            cb: ticketCallback
        }, callbackFn);
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 222, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkInput();
}
function sendTicketVk(sessionObject, receiverVk, ticketHead, ticketPayload, ticketCallback, callback) {
    let ticketId;

    function checkInput(){
        if(receiverVk && _.isString(receiverVk) && receiverVk.length <= 9 && ticketHead && _.isString(ticketHead)
            && ticketHead.length <= 128 && _.isPlainObject(ticketPayload) && _.isBoolean(ticketCallback)){
            checkSession();
        } else {
            justUnlockSession(400, new ErrorResponse(673, 'Invalid input arguments'));
        }
    }
    function checkSession(){
        if(sessionObject.aid){
            if(sessionObject.vkId === receiverVk){
                justUnlockSession(400, new ErrorResponse(223, 'Nope'));
            } else if(sessionObject.pcrd && sessionObject.pid && sessionObject.hid){
                getTicketId();
            } else {
                justUnlockSession(400, new ErrorResponse(224, 'You do not have a profile or should get one'));
            }
        } else {
            justUnlockSession(500, new ErrorResponse(225, 'Malformed session'));
        }
    }
    function getTicketId() {
        let callbackFn = (err, sequenceValue) => {
            if(err){
                justUnlockSession(500, err);
            } else {
                ticketId = sequenceValue;
                addTicket();
            }
        };

        getNextSequenceValue(callbackFn);
    }
    function addTicket() {
        let callbackFn = (err, ticketCreated) => {
            if (err) {
                log.error('Mongodb Error', { code: 226, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(226, 'Database Error'));
            } else {
                delete ticketCreated._id;
                delete ticketCreated.sender;
                delete ticketCreated.cb;
                delete ticketCreated.cat;
                delete ticketCreated.ttlIndex;
                justUnlockSession(200, ticketCreated);
            }
        };

        Ticket.createNew({
            tid: ticketId,
            sender: new ObjectID(sessionObject.pid),
            receiverVk: receiverVk,
            senderId: parseInt(sessionObject.hid),
            ticketHead: ticketHead,
            payload: ticketPayload,
            cb: ticketCallback
        }, callbackFn);
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 227, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkInput();
}
function sendTicketOk(sessionObject, receiverOk, ticketHead, ticketPayload, ticketCallback, callback) {
    let ticketId;

    function checkInput(){
        if(receiverOk && _.isString(receiverOk) && receiverOk.length <= 9 && ticketHead && _.isString(ticketHead)
            && ticketHead.length <= 128 && _.isPlainObject(ticketPayload) && _.isBoolean(ticketCallback)){
            checkSession();
        } else {
            justUnlockSession(400, new ErrorResponse(674, 'Invalid input arguments'));
        }
    }
    function checkSession(){
        if(sessionObject.aid){
            if(sessionObject.okId === receiverOk){
                justUnlockSession(400, new ErrorResponse(541, 'Nope'));
            } else if(sessionObject.pcrd && sessionObject.pid && sessionObject.hid){
                getTicketId();
            } else {
                justUnlockSession(400, new ErrorResponse(542, 'You do not have a profile or should get one'));
            }
        } else {
            justUnlockSession(500, new ErrorResponse(543, 'Malformed session'));
        }
    }
    function getTicketId() {
        let callbackFn = (err, sequenceValue) => {
            if(err){
                justUnlockSession(500, err);
            } else {
                ticketId = sequenceValue;
                addTicket();
            }
        };

        getNextSequenceValue(callbackFn);
    }
    function addTicket() {
        let callbackFn = (err, ticketCreated) => {
            if (err) {
                log.error('Mongodb Error', { code: 544, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(544, 'Database Error'));
            } else {
                delete ticketCreated._id;
                delete ticketCreated.sender;
                delete ticketCreated.cb;
                delete ticketCreated.cat;
                delete ticketCreated.ttlIndex;
                justUnlockSession(200, ticketCreated);
            }
        };

        Ticket.createNew({
            tid: ticketId,
            sender: new ObjectID(sessionObject.pid),
            receiverOk: receiverOk,
            senderId: parseInt(sessionObject.hid),
            ticketHead: ticketHead,
            payload: ticketPayload,
            cb: ticketCallback
        }, callbackFn);
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 545, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkInput();
}
function sendTicketFb(sessionObject, receiverFb, ticketHead, ticketPayload, ticketCallback, callback) {
    let ticketId;

    function checkInput(){
        if(receiverFb && _.isString(receiverFb) && receiverFb.length <= 64 && ticketHead && _.isString(ticketHead)
            && ticketHead.length <= 128 && _.isPlainObject(ticketPayload) && _.isBoolean(ticketCallback)){
            checkSession();
        } else {
            justUnlockSession(400, new ErrorResponse(675, 'Invalid input arguments'));
        }
    }
    function checkSession(){
        if(sessionObject.aid){
            if(sessionObject.fbId === receiverFb){
                justUnlockSession(400, new ErrorResponse(228, 'Nope'));
            } else if(sessionObject.pcrd && sessionObject.pid && sessionObject.hid){
                getTicketId();
            } else {
                justUnlockSession(400, new ErrorResponse(229, 'You do not have a profile or should get one'));
            }
        } else {
            justUnlockSession(500, new ErrorResponse(230, 'Malformed session'));
        }
    }
    function getTicketId() {
        let callbackFn = (err, sequenceValue) => {
            if(err){
                justUnlockSession(500, err);
            } else {
                ticketId = sequenceValue;
                addTicket();
            }
        };

        getNextSequenceValue(callbackFn);
    }
    function addTicket() {
        let callbackFn = (err, ticketCreated) => {
            if (err) {
                log.error('Mongodb Error', { code: 231, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(231, 'Database Error'));
            } else {
                delete ticketCreated._id;
                delete ticketCreated.sender;
                delete ticketCreated.cb;
                delete ticketCreated.cat;
                delete ticketCreated.ttlIndex;
                justUnlockSession(200, ticketCreated);
            }
        };

        Ticket.createNew({
            tid: ticketId,
            sender: new ObjectID(sessionObject.pid),
            receiverFb: receiverFb,
            senderId: parseInt(sessionObject.hid),
            ticketHead: ticketHead,
            payload: ticketPayload,
            cb: ticketCallback
        }, callbackFn);
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 232, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkInput();
}
function confirmTicket(sessionObject, ticketId, callback) {
    function checkInput(){
        if(ticketId && _.isNumber(ticketId)){
            checkSession();
        } else {
            justUnlockSession(400, new ErrorResponse(676, 'Invalid input arguments'));
        }
    }
    function checkSession(){
        if(sessionObject.aid){
            if(sessionObject.pcrd && sessionObject.pid && sessionObject.hid){
                doConfirm();
            } else {
                justUnlockSession(400, new ErrorResponse(233, 'You do not have a profile or should get one'));
            }
        } else {
            justUnlockSession(500, new ErrorResponse(234, 'Malformed session'));
        }
    }
    function doConfirm() {
        let callbackFn = (err, result) => {
            if (err) {
                log.error('Mongodb Error', { code: 235, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(235, 'Database Error'));
            } else if (result.modifiedCount === 0) {
                justUnlockSession(400, new ErrorResponse(236, 'Ticket not found'));
            } else {
                justUnlockSession(200, { success: 'Ticket confirmed' });
            }
        };

        Ticket.updateOne(
            {
                tid: ticketId, receiver: new ObjectID(sessionObject.pid), sat: { $exists: false },
                ttlIndex: { $gt: new Date(_.now() - goblinBase.ticketsConfig.ticketLifetime) }
            },
            { $set: { sat: true, ttlIndex: new Date() }},
            callbackFn
        );
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 237, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkInput();
}
function confirmTicketVk(sessionObject, ticketId, callback){
    function checkInput(){
        if(ticketId && _.isNumber(ticketId)){
            checkSession();
        } else {
            justUnlockSession(400, new ErrorResponse(677, 'Invalid input arguments'));
        }
    }
    function checkSession(){
        if(sessionObject.aid){
            if(sessionObject.pcrd && sessionObject.pid && sessionObject.vkId && sessionObject.hid){
                doConfirm();
            } else {
                justUnlockSession(400, new ErrorResponse(238, 'You do not have a profile or should get one'));
            }
        } else {
            justUnlockSession(500, new ErrorResponse(239, 'Malformed session'));
        }
    }
    function doConfirm() {
        let callbackFn = (err, raw) => {
            if (err) {
                log.error('Mongodb Error', { code: 240, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(240, 'Database Error'));
            } else if (raw.n === 0) {
                justUnlockSession(400, new ErrorResponse(241, 'Ticket not found'));
            } else {
                justUnlockSession(200, { success: 'Ticket confirmed' });
            }
        };

        Ticket.updateOne(
            {
                tid: ticketId, receiverVk: sessionObject.vkId, sat: { $exists: false },
                ttlIndex: { $gt: new Date(_.now() - goblinBase.ticketsConfig.ticketLifetime) }
            },
            { $set: { sat: true, ttlIndex: new Date() }},
            callbackFn
        );
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 242, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkInput();
}
function confirmTicketOk(sessionObject, ticketId, callback){
    function checkInput(){
        if(ticketId && _.isNumber(ticketId)){
            checkSession();
        } else {
            justUnlockSession(400, new ErrorResponse(558, 'Invalid input arguments'));
        }
    }
    function checkSession(){
        if(sessionObject.aid){
            if(sessionObject.pcrd && sessionObject.pid && sessionObject.okId && sessionObject.hid){
                doConfirm();
            } else {
                justUnlockSession(400, new ErrorResponse(546, 'You do not have a profile or should get one'));
            }
        } else {
            justUnlockSession(500, new ErrorResponse(547, 'Malformed session'));
        }
    }
    function doConfirm() {
        let callbackFn = (err, raw) => {
            if (err) {
                log.error('Mongodb Error', { code: 548, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(548, 'Database Error'));
            } else if (raw.n === 0) {
                justUnlockSession(400, new ErrorResponse(549, 'Ticket not found'));
            } else {
                justUnlockSession(200, { success: 'Ticket confirmed' });
            }
        };

        Ticket.updateOne(
            {
                tid: ticketId, receiverOk: sessionObject.okId, sat: { $exists: false },
                ttlIndex: { $gt: new Date(_.now() - goblinBase.ticketsConfig.ticketLifetime) }
            },
            { $set: { sat: true, ttlIndex: new Date() }},
            callbackFn
        )
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 550, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkInput();
}
function confirmTicketFb(sessionObject, ticketId, callback){
    function checkInput(){
        if(ticketId && _.isNumber(ticketId)){
            checkSession();
        } else {
            justUnlockSession(400, new ErrorResponse(968, 'Invalid input arguments'));
        }
    }
    function checkSession(){
        if(sessionObject.aid){
            if(sessionObject.pcrd && sessionObject.pid && sessionObject.fbId && sessionObject.hid){
                doConfirm();
            } else {
                justUnlockSession(400, new ErrorResponse(243, 'You do not have a profile or should get one'));
            }
        } else {
            justUnlockSession(500, new ErrorResponse(244, 'Malformed session'));
        }
    }
    function doConfirm() {
        let callbackFn = (err, raw) => {
            if (err) {
                log.error('Mongodb Error', { code: 245, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(245, 'Database Error'));
            } else if (raw.n === 0) {
                justUnlockSession(400, new ErrorResponse(246, 'Ticket not found'));
            } else {
                justUnlockSession(200, { success: 'Ticket confirmed' });
            }
        };

        Ticket.updateOne(
            {
                tid: ticketId, receiverFb: sessionObject.fbId, sat: { $exists: false },
                ttlIndex: { $gt: new Date(_.now() - goblinBase.ticketsConfig.ticketLifetime) }
            },
            { $set: { sat: true, ttlIndex: new Date() }},
            callbackFn
        )
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 247, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkInput();
}
function rejectTicket(sessionObject, ticketId, callback) {
    function checkInput(){
        if(ticketId && _.isNumber(ticketId)){
            checkSession();
        } else {
            justUnlockSession(400, new ErrorResponse(969, 'Invalid input arguments'));
        }
    }
    function checkSession(){
        if(sessionObject.aid){
            if(sessionObject.pcrd && sessionObject.pid && sessionObject.hid){
                doReject();
            } else {
                justUnlockSession(400, new ErrorResponse(248, 'You do not have a profile or should get one'));
            }
        } else {
            justUnlockSession(500, new ErrorResponse(249, 'Malformed session'));
        }
    }
    function doReject() {
        let callbackFn = (err, result) => {
            if (err) {
                log.error('Mongodb Error', { code: 250, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(250, 'Database Error'));
            } else if (result.modifiedCount === 0) {
                justUnlockSession(400, new ErrorResponse(251, 'Ticket not found'));
            } else {
                justUnlockSession(200, { success: 'Ticket rejected' });
            }
        };

        Ticket.updateOne(
            {
                tid: ticketId, receiver: new ObjectID(sessionObject.pid), sat: { $exists: false },
                ttlIndex: { $gt: new Date(_.now() - goblinBase.ticketsConfig.ticketLifetime) }
            },
            { $set: { sat: false, ttlIndex: new Date() }},
            callbackFn
        );
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 252, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkInput();
}
function rejectTicketVk(sessionObject, ticketId, callback){
    function checkInput(){
        if(ticketId && _.isNumber(ticketId)){
            checkSession();
        } else {
            justUnlockSession(400, new ErrorResponse(970, 'Invalid input arguments'));
        }
    }
    function checkSession(){
        if(sessionObject.aid){
            if(sessionObject.pcrd && sessionObject.pid && sessionObject.vkId && sessionObject.hid){
                doReject();
            } else {
                justUnlockSession(400, new ErrorResponse(253, 'You do not have a profile or should get one'));
            }
        } else {
            justUnlockSession(500, new ErrorResponse(254, 'Malformed session'));
        }
    }
    function doReject() {
        let callbackFn = (err, raw) => {
            if (err) {
                log.error('Mongodb Error', { code: 255, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(255, 'Database Error'));
            } else if (raw.n === 0) {
                justUnlockSession(400, new ErrorResponse(256, 'Ticket not found'));
            } else {
                justUnlockSession(200, { success: 'Ticket rejected' });
            }
        };

        Ticket.updateOne(
            {
                tid: ticketId, receiverVk: sessionObject.vkId, sat: { $exists: false },
                ttlIndex: { $gt: new Date(_.now() - goblinBase.ticketsConfig.ticketLifetime) }
            },
            { $set: { sat: false, ttlIndex: new Date() }},
            callbackFn
        );
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 257, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkInput();
}
function rejectTicketOk(sessionObject, ticketId, callback){
    function checkInput(){
        if(ticketId && _.isNumber(ticketId)){
            checkSession();
        } else {
            justUnlockSession(400, new ErrorResponse(971, 'Invalid input arguments'));
        }
    }
    function checkSession(){
        if(sessionObject.aid){
            if(sessionObject.pcrd && sessionObject.pid && sessionObject.okId && sessionObject.hid){
                doReject();
            } else {
                justUnlockSession(400, new ErrorResponse(551, 'You do not have a profile or should get one'));
            }
        } else {
            justUnlockSession(500, new ErrorResponse(552, 'Malformed session'));
        }
    }
    function doReject() {
        let callbackFn = (err, raw) => {
            if (err) {
                log.error('Mongodb Error', { code: 553, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(553, 'Database Error'));
            } else if (raw.n === 0) {
                justUnlockSession(400, new ErrorResponse(554, 'Ticket not found'));
            } else {
                justUnlockSession(200, { success: 'Ticket rejected' });
            }
        };

        Ticket.updateOne(
            {
                tid: ticketId, receiverOk: sessionObject.okId, sat: { $exists: false },
                ttlIndex: { $gt: new Date(_.now() - goblinBase.ticketsConfig.ticketLifetime) }
            },
            { $set: { sat: false, ttlIndex: new Date() }},
            callbackFn
        );
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 555, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkInput();
}
function rejectTicketFb(sessionObject, ticketId, callback){
    function checkInput(){
        if(ticketId && _.isNumber(ticketId)){
            checkSession();
        } else {
            justUnlockSession(400, new ErrorResponse(972, 'Invalid input arguments'));
        }
    }
    function checkSession(){
        if(sessionObject.aid){
            if(sessionObject.pcrd && sessionObject.pid && sessionObject.fbId && sessionObject.hid){
                doReject();
            } else {
                justUnlockSession(400, new ErrorResponse(258, 'You do not have a profile or should get one'));
            }
        } else {
            justUnlockSession(500, new ErrorResponse(259, 'Malformed session'));
        }
    }
    function doReject() {
        let callbackFn = (err, raw) => {
            if (err) {
                log.error('Mongodb Error', { code: 260, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(260, 'Database Error'));
            } else if (raw.n === 0) {
                justUnlockSession(400, new ErrorResponse(261, 'Ticket not found'));
            } else {
                justUnlockSession(200, { success: 'Ticket rejected' });
            }
        };

        Ticket.updateOne(
            {
                tid: ticketId, receiverFb: sessionObject.fbId, sat: { $exists: false },
                ttlIndex: { $gt: new Date(_.now() - goblinBase.ticketsConfig.ticketLifetime) }
            },
            { $set: { sat: false, ttlIndex: new Date() }},
            callbackFn
        );
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 262, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkInput();
}
function dischargeTicket(sessionObject, ticketId, callback) {
    function checkInput(){
        if(ticketId && _.isNumber(ticketId)){
            checkSession();
        } else {
            justUnlockSession(400, new ErrorResponse(973, 'Invalid input arguments'));
        }
    }
    function checkSession(){
        if(sessionObject.aid){
            if(sessionObject.pcrd && sessionObject.pid && sessionObject.hid){
                doDischarge();
            } else {
                justUnlockSession(400, new ErrorResponse(263, 'You do not have a profile or should get one'));
            }
        } else {
            justUnlockSession(500, new ErrorResponse(264, 'Malformed session'));
        }
    }
    function doDischarge() {
        let callbackFn = (err, result) => {
            if (err) {
                log.error('Mongodb Error', { code: 265, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(265, 'Database Error'));
            } else if (result.deletedCount === 0) {
                justUnlockSession(400, new ErrorResponse(266, 'Ticket not found'));
            } else {
                justUnlockSession(200, { success: 'Ticket discharged' });
            }
        };

        Ticket.deleteOne(
            {
                tid: ticketId, sender: new ObjectID(sessionObject.pid), sat: { $exists: false },
                ttlIndex: { $gt: new Date(_.now() - goblinBase.ticketsConfig.ticketLifetime) }
            },
            callbackFn
        );
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 267, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkInput();
}
function dismissTicket(sessionObject, ticketId, callback) {
    let query;

    function checkInput(){
        if(ticketId && _.isNumber(ticketId)){
            checkSession();
        } else {
            justUnlockSession(400, new ErrorResponse(974, 'Invalid input arguments'));
        }
    }
    function checkSession(){
        if(sessionObject.aid){
            if(sessionObject.pcrd && sessionObject.pid && sessionObject.hid){
                setQuery();
            } else {
                justUnlockSession(400, new ErrorResponse(268, 'You do not have a profile or should get one'));
            }
        } else {
            justUnlockSession(500, new ErrorResponse(269, 'Malformed session'));
        }
    }
    function setQuery() {
        if (!sessionObject.pid && !sessionObject.vkId && !sessionObject.fbId && !sessionObject.okId) {
            justUnlockSession(400, new ErrorResponse(975, 'No inputs'));
        } else {
            if(sessionObject.pid && !sessionObject.vkId && !sessionObject.fbId && !sessionObject.okId){
                query = { $or: [
                        { sender: new ObjectID(sessionObject.pid), cb: true },
                        { receiver: new ObjectID(sessionObject.pid), cb: false }
                    ]};
            } else if(sessionObject.pid && sessionObject.vkId){
                query = { $or: [
                        { sender: new ObjectID(sessionObject.pid), cb: true },
                        { receiver: new ObjectID(sessionObject.pid), cb: false },
                        { receiverVk: sessionObject.vkId, cb: false }
                    ]};
            } else if(sessionObject.pid && sessionObject.fbId){
                query = { $or: [
                        { sender: new ObjectID(sessionObject.pid), cb: true },
                        { receiver: new ObjectID(sessionObject.pid), cb: false },
                        { receiverFb: sessionObject.fbId, cb: false }
                    ]};
            } else if(sessionObject.pid && sessionObject.okId){
                query = { $or: [
                        { sender: new ObjectID(sessionObject.pid), cb: true },
                        { receiver: new ObjectID(sessionObject.pid), cb: false },
                        { receiverOk: sessionObject.okId, cb: false }
                    ]};
            }

            query.tid = parseInt(ticketId);
            query.sat = false;
            query.ttlIndex = { $gt: new Date(_.now() - goblinBase.ticketsConfig.ticketLifetime) };

            doDismiss();
        }
    }
    function doDismiss() {
        let callbackFn = (err, result) => {
            if (err) {
                log.error('Mongodb Error', { code: 270, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(270, 'Database Error'));
            } else if (result.deletedCount === 0) {
                justUnlockSession(400, new ErrorResponse(271, 'Ticket not found'));
            } else {
                justUnlockSession(200, { success: 'Ticket dismissed' });
            }
        };

        Ticket.deleteOne(query, callbackFn);
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 272, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkInput();
}
function releaseTicket(sessionObject, ticketId, callback) {
    let query;

    function checkInput(){
        if(ticketId && _.isNumber(ticketId)){
            checkSession();
        } else {
            justUnlockSession(400, new ErrorResponse(977, 'Invalid input arguments'));
        }
    }
    function checkSession(){
        if(sessionObject.aid){
            if(sessionObject.pcrd && sessionObject.pid && sessionObject.hid){
                setQuery();
            } else {
                justUnlockSession(400, new ErrorResponse(273, 'You do not have a profile or should get one'));
            }
        } else {
            justUnlockSession(500, new ErrorResponse(274, 'Malformed session'));
        }
    }
    function setQuery() {
        if (!sessionObject.pid && !sessionObject.vkId && !sessionObject.fbId && !sessionObject.okId) {
            justUnlockSession(400, new ErrorResponse(976, 'No inputs'));
        } else {
            if(sessionObject.pid && !sessionObject.vkId && !sessionObject.fbId && !sessionObject.okId){
                query = { $or: [
                        { sender: new ObjectID(sessionObject.pid), cb: true },
                        { receiver: new ObjectID(sessionObject.pid), cb: false }
                    ]};
            } else if(sessionObject.pid && sessionObject.vkId){
                query = { $or: [
                        { sender: new ObjectID(sessionObject.pid), cb: true },
                        { receiver: new ObjectID(sessionObject.pid), cb: false },
                        { receiverVk: sessionObject.vkId, cb: false }
                    ]};
            } else if(sessionObject.pid && sessionObject.fbId){
                query = { $or: [
                        { sender: new ObjectID(sessionObject.pid), cb: true },
                        { receiver: new ObjectID(sessionObject.pid), cb: false },
                        { receiverFb: sessionObject.fbId, cb: false }
                    ]};
            } else if(sessionObject.pid && sessionObject.okId){
                query = { $or: [
                        { sender: new ObjectID(sessionObject.pid), cb: true },
                        { receiver: new ObjectID(sessionObject.pid), cb: false },
                        { receiverOk: sessionObject.okId, cb: false }
                    ]};
            }

            query.tid = parseInt(ticketId);
            query.sat = true;
            query.ttlIndex = { $gt: new Date(_.now() - goblinBase.ticketsConfig.ticketLifetime) };

            doRelease();
        }
    }
    function doRelease() {
        let callbackFn = (err, result) => {
            if (err) {
                log.error('Mongodb Error', { code: 275, err: { message: err.message, name: err.name } });
                justUnlockSession(500, new ErrorResponse(275, 'Database Error'));
            } else if (result.deletedCount === 0) {
                justUnlockSession(400, new ErrorResponse(276, 'Ticket not found'));
            } else {
                justUnlockSession(200, { success: 'Ticket released' });
            }
        };

        Ticket.deleteOne(query, callbackFn);
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 277, err: { code: err.code, command: err.command, message: err.message } });
            }
            callback(code, response);
        };

        sessionKeeper.flushSession(null, sessionObject, null, callbackFn);
    }

    checkInput();
}

function getNextSequenceValue(callback){
    const SEQUENCE_NAME = 'ticketId';

    TicketCounter.getNextSequenceValue(SEQUENCE_NAME, 1, callback);
}