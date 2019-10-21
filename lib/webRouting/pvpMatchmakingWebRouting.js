'use strict';

const GET = 'GET',
    POST = 'POST';

module.exports = {
    register
};

var _ = require('lodash');

var matchmaking = require('../features/matchmaking/matchmaking.js');

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
    function getCheckBattleNoSearch(){
        app.route({
            method: GET,
            url: `/${apiPrefix}pvp.checkBattleNoSearch`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _checkBattleNoSearch
        });
        getDropMatchmaking();
    }
    function getDropMatchmaking(){
        app.route({
            method: GET,
            url: `/${apiPrefix}pvp.dropMatchmaking`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _dropMatchmaking
        });
        postSearchForOpponent();
    }
    function postSearchForOpponent(){
        app.route({
            method: POST,
            url: `/${apiPrefix}pvp.searchForOpponent`,
            bodyLimit: BODY_LIMIT,
            preHandler: [
                bodyIsTheMust, measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _searchForOpponent
        });
        getStopSearchingForOpponent();
    }
    function getStopSearchingForOpponent(){
        app.route({
            method: GET,
            url: `/${apiPrefix}pvp.stopSearchingForOpponent`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _stopSearchingForOpponent
        });
        getHandSelectOpponent();
    }
    function getHandSelectOpponent(){
        app.route({
            method: GET,
            url: `/${apiPrefix}pvp.handSelectOpponent`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _handSelectOpponent
        });
        getAcceptMatch();
    }
    function getAcceptMatch(){
        app.route({
            method: GET,
            url: `/${apiPrefix}pvp.acceptMatch`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _acceptMatch
        });
        getWaitForOpponentToAccept();
    }
    function getWaitForOpponentToAccept(){
        app.route({
            method: GET,
            url: `/${apiPrefix}pvp.waitForOpponentToAccept`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _waitForOpponentToAccept
        });
        getDeclineMatch();
    }
    function getDeclineMatch(){
        app.route({
            method: GET,
            url: `/${apiPrefix}pvp.declineMatch`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _declineMatch
        });
    }

    getCheckBattleNoSearch();
}

function _checkBattleNoSearch(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.pvpConfig){
        return res.code(501).send(new ErrorResponse(675, 'PvP not configured'));
    }
    matchmaking.justCheckBattleNoSearch(req.sessionObject, callbackFn);
}
function _dropMatchmaking(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.pvpConfig){
        return res.code(501).send(new ErrorResponse(676, 'PvP not configured'));
    }
    matchmaking.dropMatchmaking(req.sessionObject, callbackFn);
}
function _searchForOpponent(req, res){
    let callbackFn = (code, response) => {
        if(!res.sent){
            res.code(code).send(response);
        }
    };

    if(!goblinBase.pvpConfig){
        return res.code(501).send(new ErrorResponse(677, 'PvP not configured'));
    }
    req.res = res;
    matchmaking.searchForOpponentOverall(
        req.sessionObject, req, req.clientPlatform, req.clientVersion, req.query.segment,
        req.query.strat, (req.body && !_.isEmpty(req.body)) ? req.body : null,
        callbackFn
    );
}
function _stopSearchingForOpponent(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.pvpConfig){
        return res.code(501).send(new ErrorResponse(678, 'PvP not configured'));
    }
    matchmaking.stopSearchingForOpponent(req.sessionObject, callbackFn);
}
function _handSelectOpponent(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.pvpConfig){
        return res.code(501).send(new ErrorResponse(687, 'PvP not configured'));
    }
    matchmaking.matchWithHandSelectedOpponent(req.sessionObject, +req.query.hid, callbackFn);
}
function _acceptMatch(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.pvpConfig){
        return res.code(501).send(new ErrorResponse(688, 'PvP not configured'));
    }
    matchmaking.acceptMatch(req.sessionObject, callbackFn);
}
function _waitForOpponentToAccept(req, res){
    if(!goblinBase.pvpConfig){
        return res.code(501).send(new ErrorResponse(686, 'PvP not configured'));
    }
    req.res = res;
    matchmaking.waitForOpponentToAccept(req.sessionObject, req);
}
function _declineMatch(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.pvpConfig){
        return res.code(501).send(new ErrorResponse(197, 'PvP not configured'));
    }
    matchmaking.declineMatch(req.sessionObject, callbackFn);
}