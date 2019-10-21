'use strict';

const GET = 'GET',
    POST = 'POST';

module.exports = {
    register
};

var tickets = require('../features/metaFeatures/tickets.js');

const BODY_LIMIT = 2097152;

const goblinBase = require('../../index.js').getGoblinBase();

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
    function getListSendedTickets(){
        app.route({
            method: GET,
            url: `/${apiPrefix}tickets.listSendedTickets`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _listSendedTickets
        });
        getListReceivedTickets();
    }
    function getListReceivedTickets(){
        app.route({
            method: GET,
            url: `/${apiPrefix}tickets.listReceivedTickets`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _listReceivedTickets
        });
        postSendTicket();
    }
    function postSendTicket(){
        app.route({
            method: POST,
            url: `/${apiPrefix}tickets.sendTicket`,
            bodyLimit: BODY_LIMIT,
            preHandler: [
                bodyIsTheMust, measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _sendTicket
        });
        postSendTicketVk();
    }
    function postSendTicketVk(){
        app.route({
            method: POST,
            url: `/${apiPrefix}tickets.sendTicketVk`,
            bodyLimit: BODY_LIMIT,
            preHandler: [
                bodyIsTheMust, measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _sendTicketVk
        });
        postSendTicketOk();
    }
    function postSendTicketOk(){
        app.route({
            method: POST,
            url: `/${apiPrefix}tickets.sendTicketOk`,
            bodyLimit: BODY_LIMIT,
            preHandler: [
                bodyIsTheMust, measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _sendTicketOk
        });
        postSendTicketFb();
    }
    function postSendTicketFb(){
        app.route({
            method: POST,
            url: `/${apiPrefix}tickets.sendTicketFb`,
            bodyLimit: BODY_LIMIT,
            preHandler: [
                bodyIsTheMust, measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _sendTicketFb
        });
        getConfirmTicket();
    }
    function getConfirmTicket(){
        app.route({
            method: GET,
            url: `/${apiPrefix}tickets.confirmTicket`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _confirmTicket
        });
        getConfirmTicketVk();
    }
    function getConfirmTicketVk(){
        app.route({
            method: GET,
            url: `/${apiPrefix}tickets.confirmTicketVk`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _confirmTicketVk
        });
        getConfirmTicketOk();
    }
    function getConfirmTicketOk(){
        app.route({
            method: GET,
            url: `/${apiPrefix}tickets.confirmTicketOk`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _confirmTicketOk
        });
        getConfirmTicketFb();
    }
    function getConfirmTicketFb(){
        app.route({
            method: GET,
            url: `/${apiPrefix}tickets.confirmTicketFb`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _confirmTicketFb
        });
        getRejectTicket();
    }
    function getRejectTicket(){
        app.route({
            method: GET,
            url: `/${apiPrefix}tickets.rejectTicket`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _rejectTicket
        });
        getRejectTicketVk();
    }
    function getRejectTicketVk(){
        app.route({
            method: GET,
            url: `/${apiPrefix}tickets.rejectTicketVk`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _rejectTicketVk
        });
        getRejectTicketOk();
    }
    function getRejectTicketOk(){
        app.route({
            method: GET,
            url: `/${apiPrefix}tickets.rejectTicketOk`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _rejectTicketOk
        });
        getRejectTicketFb();
    }
    function getRejectTicketFb(){
        app.route({
            method: GET,
            url: `/${apiPrefix}tickets.rejectTicketFb`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _rejectTicketFb
        });
        getDischargeTicket();
    }
    function getDischargeTicket(){
        app.route({
            method: GET,
            url: `/${apiPrefix}tickets.dischargeTicket`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _dischargeTicket
        });
        getDismissTicket();
    }
    function getDismissTicket(){
        app.route({
            method: GET,
            url: `/${apiPrefix}tickets.dismissTicket`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _dismissTicket
        });
        getReleaseTicket();
    }
    function getReleaseTicket(){
        app.route({
            method: GET,
            url: `/${apiPrefix}tickets.releaseTicket`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _releaseTicket
        });
    }

    getListSendedTickets();
}

function _listSendedTickets(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.ticketsConfig){
        return res.code(501).send(new ErrorResponse(199, 'Tickets not configured'));
    }
    if(goblinBase.authoritarianConfig && goblinBase.authoritarianConfig.disallowDirectProfileExposure){
        return res.code(403).send(new ErrorResponse(200, 'Not allowed!'));
    }
    tickets.listSendedTickets(req.sessionObject, req.query.skip, req.query.limit, callbackFn);
}
function _listReceivedTickets(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.ticketsConfig){
        return res.code(501).send(new ErrorResponse(201, 'Tickets not configured'));
    }
    if(goblinBase.authoritarianConfig && goblinBase.authoritarianConfig.disallowDirectProfileExposure){
        return res.code(403).send(new ErrorResponse(202, 'Not allowed!'));
    }
    tickets.listReceivedTickets(req.sessionObject, req.query.skip, req.query.limit, callbackFn);
}
function _sendTicket(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.ticketsConfig){
        return res.code(501).send(new ErrorResponse(203, 'Tickets not configured'));
    }
    if(goblinBase.authoritarianConfig && goblinBase.authoritarianConfig.disallowDirectProfileExposure){
        res.code(403).send(new ErrorResponse(204, 'Not allowed!'));
    }
    tickets.sendTicket(
        req.sessionObject, +req.query.receiverId, req.body.ticketHead,
        req.body.ticketPayload, req.body.ticketCallback,
        callbackFn
    );
}
function _sendTicketVk(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.ticketsConfig){
        return res.code(501).send(new ErrorResponse(205, 'Tickets not configured'));
    }
    if(!goblinBase.vkCredentials){
        return res.code(501).send(new ErrorResponse(690, 'No VK credentials'));
    }
    if(goblinBase.authoritarianConfig && goblinBase.authoritarianConfig.disallowDirectProfileExposure){
        return res.code(403).send(new ErrorResponse(440, 'Not allowed!'));
    }
    tickets.sendTicketVk(
        req.sessionObject, req.query.receiverVk, req.body.ticketHead,
        req.body.ticketPayload, req.body.ticketCallback,
        callbackFn
    );
}
function _sendTicketOk(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.ticketsConfig){
        return res.code(501).send(new ErrorResponse(441, 'Tickets not configured'));
    }
    if(!goblinBase.okCredentials){
        return res.code(501).send(new ErrorResponse(442, 'No OK credentials'));
    }
    if(goblinBase.authoritarianConfig && goblinBase.authoritarianConfig.disallowDirectProfileExposure){
        return res.code(403).send(new ErrorResponse(462, 'Not allowed!'));
    }
    tickets.sendTicketOk(
        req.sessionObject, req.query.receiverOk, req.body.ticketHead,
        req.body.ticketPayload, req.body.ticketCallback,
        callbackFn
    );
}
function _sendTicketFb(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.ticketsConfig){
        return res.code(501).send(new ErrorResponse(463, 'Tickets not configured'));
    }
    if(!goblinBase.facebookCredentials){
        return res.code(501).send(new ErrorResponse(464, 'No Facebook credentials'));
    }
    if(goblinBase.authoritarianConfig && goblinBase.authoritarianConfig.disallowDirectProfileExposure){
        return res.code(403).send(new ErrorResponse(443, 'Not allowed!'));
    }
    tickets.sendTicketFb(
        req.sessionObject, req.query.receiverFb, req.body.ticketHead,
        req.body.ticketPayload, req.body.ticketCallback,
        callbackFn
    );
}
function _confirmTicket(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.ticketsConfig){
        return res.code(501).send(new ErrorResponse(444, 'Tickets not configured'));
    }
    if(goblinBase.authoritarianConfig && goblinBase.authoritarianConfig.disallowDirectProfileExposure){
        return res.code(403).send(new ErrorResponse(465, 'Not allowed!'));
    }
    tickets.confirmTicket(req.sessionObject, parseInt(req.query.ticketId), callbackFn);
}
function _confirmTicketVk(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.ticketsConfig){
        return res.code(501).send(new ErrorResponse(466, 'Tickets not configured'));
    }
    if(!goblinBase.vkCredentials){
        return res.code(501).send(new ErrorResponse(467, 'No VK credentials'));
    }
    if(goblinBase.authoritarianConfig && goblinBase.authoritarianConfig.disallowDirectProfileExposure){
        return res.code(403).send(new ErrorResponse(445, 'Not allowed!'));
    }
    tickets.confirmTicketVk(req.sessionObject, parseInt(req.query.ticketId), callbackFn);
}
function _confirmTicketOk(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.ticketsConfig){
        return res.code(501).send(new ErrorResponse(446, 'Tickets not configured'));
    }
    if(!goblinBase.okCredentials){
        return res.code(501).send(new ErrorResponse(447, 'No OK credentials'));
    }
    if(goblinBase.authoritarianConfig && goblinBase.authoritarianConfig.disallowDirectProfileExposure){
        return res.code(403).send(new ErrorResponse(468, 'Not allowed!'));
    }
    tickets.confirmTicketOk(req.sessionObject, parseInt(req.query.ticketId), callbackFn);
}
function _confirmTicketFb(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.ticketsConfig){
        return res.code(501).send(new ErrorResponse(469, 'Tickets not configured'));
    }
    if(!goblinBase.facebookCredentials){
        return res.code(501).send(new ErrorResponse(470, 'No Facebook credentials'));
    }
    if(goblinBase.authoritarianConfig && goblinBase.authoritarianConfig.disallowDirectProfileExposure){
        return res.code(403).send(new ErrorResponse(448, 'Not allowed!'));
    }
    tickets.confirmTicketFb(req.sessionObject, parseInt(req.query.ticketId), callbackFn);
}
function _rejectTicket(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.ticketsConfig){
        return res.code(501).send(new ErrorResponse(449, 'Tickets not configured'));
    }
    if(goblinBase.authoritarianConfig && goblinBase.authoritarianConfig.disallowDirectProfileExposure){
        return res.code(403).send(new ErrorResponse(450, 'Not allowed!'));
    }
    tickets.rejectTicket(req.sessionObject, parseInt(req.query.ticketId), callbackFn);
}
function _rejectTicketVk(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.ticketsConfig){
        return res.code(501).send(new ErrorResponse(471, 'Tickets not configured'));
    }
    if(!goblinBase.vkCredentials){
        return res.code(501).send(new ErrorResponse(472, 'No VK credentials'));
    }
    if(goblinBase.authoritarianConfig && goblinBase.authoritarianConfig.disallowDirectProfileExposure){
        return res.code(403).send(new ErrorResponse(473, 'Not allowed!'));
    }
    tickets.rejectTicketVk(req.sessionObject, parseInt(req.query.ticketId), callbackFn);
}
function _rejectTicketOk(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.ticketsConfig){
        return res.code(501).send(new ErrorResponse(451, 'Tickets not configured'));
    }
    if(!goblinBase.okCredentials){
        return res.code(501).send(new ErrorResponse(452, 'No OK credentials'));
    }
    if(goblinBase.authoritarianConfig && goblinBase.authoritarianConfig.disallowDirectProfileExposure){
        return res.code(403).send(new ErrorResponse(453, 'Not allowed!'));
    }
    tickets.rejectTicketOk(req.sessionObject, parseInt(req.query.ticketId), callbackFn);
}
function _rejectTicketFb(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.ticketsConfig){
        return res.code(501).send(new ErrorResponse(474, 'Tickets not configured'));
    }
    if(!goblinBase.facebookCredentials){
        return res.code(501).send(new ErrorResponse(475, 'No Facebook credentials'));
    }
    if(goblinBase.authoritarianConfig && goblinBase.authoritarianConfig.disallowDirectProfileExposure){
        return res.code(403).send(new ErrorResponse(476, 'Not allowed!'));
    }
    tickets.rejectTicketFb(req.sessionObject, parseInt(req.query.ticketId), callbackFn);
}
function _dischargeTicket(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.ticketsConfig){
        return res.code(501).send(new ErrorResponse(454, 'Tickets not configured'));
    }
    if(goblinBase.authoritarianConfig && goblinBase.authoritarianConfig.disallowDirectProfileExposure){
        return res.code(403).send(new ErrorResponse(455, 'Not allowed!'));
    }
    tickets.dischargeTicket(req.sessionObject, parseInt(req.query.ticketId), callbackFn);
}
function _dismissTicket(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.ticketsConfig){
        return res.code(501).send(new ErrorResponse(477, 'Tickets not configured'));
    }
    if(goblinBase.authoritarianConfig && goblinBase.authoritarianConfig.disallowDirectProfileExposure){
        return res.code(403).send(new ErrorResponse(478, 'Not allowed!'));
    }
    tickets.dismissTicket(req.sessionObject, parseInt(req.query.ticketId), callbackFn);
}
function _releaseTicket(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.ticketsConfig){
        return res.code(501).send(new ErrorResponse(479, 'Tickets not configured'));
    }
    if(goblinBase.authoritarianConfig && goblinBase.authoritarianConfig.disallowDirectProfileExposure){
        return res.code(403).send(new ErrorResponse(456, 'Not allowed!'));
    }
    tickets.releaseTicket(req.sessionObject, parseInt(req.query.ticketId), callbackFn);
}