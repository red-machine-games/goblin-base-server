'use strict';

const GET = 'GET',
    POST = 'POST';

module.exports = {
    register
};

var leaderboards = require('../features/leaderboards/leaderboards.js');

const BODY_LIMIT = 262144;

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
    function postRefreshVkFriendsCache(){
        app.route({
            method: POST,
            url: `/${apiPrefix}tops.refreshVkFriendsCache`,
            bodyLimit: BODY_LIMIT,
            preHandler: [
                bodyIsTheMust, measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _refreshVkFriendsCache
        });
        postRefreshOkFriendsCache();
    }
    function postRefreshOkFriendsCache(){
        app.route({
            method: POST,
            url: `/${apiPrefix}tops.refreshOkFriendsCache`,
            bodyLimit: BODY_LIMIT,
            preHandler: [
                bodyIsTheMust, measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _refreshOkFriendsCache
        });
        postRefreshFbFriendsCache();
    }
    function postRefreshFbFriendsCache(){
        app.route({
            method: POST,
            url: `/${apiPrefix}tops.refreshFbFriendsCache`,
            bodyLimit: BODY_LIMIT,
            preHandler: [
                bodyIsTheMust, measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _refreshFbFriendsCache
        });
        postPostARecord();
    }
    function postPostARecord(){
        app.route({
            method: POST,
            url: `/${apiPrefix}tops.postARecord`,
            bodyLimit: BODY_LIMIT,
            preHandler: [
                bodyIsTheMust, measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _postARecord
        });
        getGetPlayerRecord();
    }
    function getGetPlayerRecord(){
        app.route({
            method: GET,
            url: `/${apiPrefix}tops.getPlayerRecord`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _getPlayerRecord
        });
        getGetLeadersOverall();
    }
    function getGetLeadersOverall(){
        app.route({
            method: GET,
            url: `/${apiPrefix}tops.getLeadersOverall`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _getLeadersOverall
        });
        getGetLeadersWithinFriends();
    }
    function getGetLeadersWithinFriends(){
        app.route({
            method: GET,
            url: `/${apiPrefix}tops.getLeadersWithinFriends`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _getLeadersWithinFriends
        });
        getGetSomeonesRating();
    }
    function getGetSomeonesRating(){
        app.route({
            method: GET,
            url: `/${apiPrefix}tops.getSomeonesRating`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _getSomeonesRating
        });
        getRemoveRecord();
    }
    function getRemoveRecord(){
        app.route({
            method: GET,
            url: `/${apiPrefix}tops.removeRecord`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _removeRecord
        });
        getPubGetLeadersOverall();
    }
    function getPubGetLeadersOverall(){
        app.route({
            method: GET,
            url: `/${apiPrefix}pub.getLeadersOverall`,
            preHandler: [
                measureRequest, checkMaintenance, bgRefresher
            ],
            handler: _getLeadersOverall
        });
    }

    postRefreshVkFriendsCache();
}

function _refreshVkFriendsCache(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.leaderboardsConfig){
        return res.code(501).send(new ErrorResponse(126, 'Leaderboards not configured'));
    }
    if(!goblinBase.vkCredentials){
        return res.code(501).send(new ErrorResponse(127, 'No VK credentials'));
    }
    leaderboards.refreshVkFriendsCache(req.sessionObject, req.body.friends, req.query.friendsCrc, callbackFn);
}
function _refreshOkFriendsCache(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.leaderboardsConfig){
        return res.code(501).send(new ErrorResponse(128, 'Leaderboards not configured'));
    }
    if(!goblinBase.okCredentials){
        return res.code(501).send(new ErrorResponse(131, 'No OK credentials'));
    }
    leaderboards.refreshOkFriendsCache(req.sessionObject, req.body.friends, req.query.friendsCrc, callbackFn);
}
function _refreshFbFriendsCache(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.leaderboardsConfig){
        return res.code(501).send(new ErrorResponse(132, 'Leaderboards not configured'));
    }
    if(!goblinBase.facebookCredentials){
        return res.code(501).send(new ErrorResponse(133, 'No Facebook credentials'));
    }
    leaderboards.refreshFbFriendsCache(req.sessionObject, req.body.friends, req.query.friendsCrc, callbackFn);
}
function _postARecord(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.leaderboardsConfig){
        return res.code(501).send(new ErrorResponse(134, 'Leaderboards not configured'));
    }
    if(goblinBase.authoritarianConfig && goblinBase.authoritarianConfig.disallowDirectProfileExposure){
        return res.code(403).send(new ErrorResponse(135, 'Not allowed!'));
    }
    leaderboards.postARecord(req.sessionObject, parseInt(req.query.value), req.query.segment, callbackFn);
}
function _getPlayerRecord(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.leaderboardsConfig){
        return res.code(501).send(new ErrorResponse(136, 'Leaderboards not configured'));
    }
    if(goblinBase.authoritarianConfig && goblinBase.authoritarianConfig.disallowDirectProfileExposure){
        return res.code(403).send(new ErrorResponse(137, 'Not allowed!'));
    }
    leaderboards.getPlayerRecord(req.sessionObject, req.query.segment, callbackFn);
}
function _getLeadersOverall(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.leaderboardsConfig){
        return res.code(501).send(new ErrorResponse(138, 'Leaderboards not configured'));
    }
    if(goblinBase.authoritarianConfig && goblinBase.authoritarianConfig.disallowDirectProfileExposure){
        return res.code(403).send(new ErrorResponse(140, 'Not allowed!'));
    }
    if(!req.sessionObject && (!goblinBase.leaderboardsConfig || !goblinBase.leaderboardsConfig.allowPublicListing)){
        return res.code(403).send(new ErrorResponse(788, 'Not allowed!'));
    }
    leaderboards.getLeadersOverall(req.sessionObject, req.query.skip, req.query.limit, req.query.segment, callbackFn);
}
function _getLeadersWithinFriends(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.leaderboardsConfig){
        return res.code(501).send(new ErrorResponse(141, 'Leaderboards not configured'));
    }
    if(goblinBase.authoritarianConfig && goblinBase.authoritarianConfig.disallowDirectProfileExposure){
        return res.code(403).send(new ErrorResponse(142, 'Not allowed!'));
    }
    leaderboards.getLeadersWithinFriends(req.sessionObject, req.query.skip, req.query.limit, req.query.segment, callbackFn);
}
function _getSomeonesRating(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.leaderboardsConfig){
        return res.code(501).send(new ErrorResponse(143, 'Leaderboards not configured'));
    }
    if(goblinBase.authoritarianConfig && goblinBase.authoritarianConfig.disallowDirectProfileExposure){
        return res.code(403).send(new ErrorResponse(144, 'Not allowed!'));
    }
    leaderboards.getSomeonesRating(req.sessionObject, +req.query.hid, req.query.segment, callbackFn);
}
function _removeRecord(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.leaderboardsConfig){
        return res.code(501).send(new ErrorResponse(145, 'Leaderboards not configured'));
    }
    if(goblinBase.authoritarianConfig && goblinBase.authoritarianConfig.disallowDirectProfileExposure){
        return res.code(403).send(new ErrorResponse(524, 'Not allowed!'));
    }
    leaderboards.removeRecord(req.sessionObject, req.query.segment, callbackFn);
}