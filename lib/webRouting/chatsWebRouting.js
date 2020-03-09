'use strict';

const GET = 'GET',
    POST = 'POST';

module.exports = {
    register
};

const goblinBase = require('../../index.js').getGoblinBase();

var chatJobs = require('../features/chats/chatJobs.js');

const BODY_LIMIT = 1048576;

var _ = require('lodash');

var platformPlusVersionCheck = require('../webMiddleware/platformPlusVersionCheck.js').doCheck,
    sessionKeeper = require('../webMiddleware/sessionKeeper.js'),
    requestOrderValidation = require('../webMiddleware/requesOrderValidation.js').theCheck,
    hmacValidation = require('../webMiddleware/hmacValidation.js').theCheck,
    bgRefresher = require('../webMiddleware/bgRefresher.js').theDo,
    measureRequest = require('../generalUtils/metricsForStatsD.js').measureRequest,
    checkMaintenance = require('../webMiddleware/maintenanceManager.js').checkMaintenance,
    bodyIsTheMust = require('../webMiddleware/sometimesBodyIsTheMust.js');

var ErrorResponse = require('../objects/ErrorResponse.js');

function register(app, apiPrefix){
    function postChatMessage(){
        app.route({
            method: POST,
            url: `/${apiPrefix}chats.message`,
            bodyLimit: BODY_LIMIT,
            preHandler: [
                bodyIsTheMust, measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _chatMessage
        });
        getListChatMessages();
    }
    function getListChatMessages(){
        app.route({
            method: GET,
            url: `/${apiPrefix}chats.list`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _listChatMessages
        });
        getFetchChatMessages();
    }
    function getFetchChatMessages(){
        app.route({
            method: GET,
            url: `/${apiPrefix}chats.fetch`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck, sessionKeeper.getSession(false, true)
            ],
            handler: _fetchChatMessages
        });
    }

    postChatMessage();
}

function _chatMessage(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.chatsConfig){
        return res.code(501).send(new ErrorResponse(1137, 'Chats not configured'));
    }
    chatJobs.postMessage(
        req.sessionObject, _.get(req, 'body.message'), req.query.group, req.query.nopersist === '1',
        callbackFn
    );
}
function _listChatMessages(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.chatsConfig){
        return res.code(501).send(new ErrorResponse(1138, 'Chats not configured'));
    }
    chatJobs.listMessages(
        req.sessionObject, +req.query.skip, +req.query.limit, req.query.group, +req.query.fromcat,
        callbackFn
    );
}
function _fetchChatMessages(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.chatsConfig){
        return res.code(501).send(new ErrorResponse(1139, 'Chats not configured'));
    }
    chatJobs.fetchMessages(req.sessionObject, req.query.group, req, res, callbackFn);
}