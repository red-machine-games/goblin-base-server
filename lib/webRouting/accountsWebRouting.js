'use strict';

const GET = 'GET',
    POST = 'POST';

module.exports = {
    register
};

const goblinBase = require('../../index.js').getGoblinBase();

var accounts = require('../features/accountsAndProfiles/accounts.js');

const BODY_LIMIT = 2097152;

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
    function postGetAccount(){
        app.route({
            method: POST,
            url: `/${apiPrefix}accounts.getAccount`,
            bodyLimit: BODY_LIMIT,
            preHandler: [
                bodyIsTheMust, measureRequest, checkMaintenance, platformPlusVersionCheck,
                requestOrderValidation, hmacValidation, sessionKeeper.setSession
            ],
            handler: _getAccount
        });
        getGetAccount();
    }
    function getGetAccount(){
        app.route({
            method: GET,
            url: `/${apiPrefix}accounts.getAccount`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation
            ],
            handler: _getAccount
        });
        getHasVkProf();
    }
    function getHasVkProf(){
        app.route({
            method: GET,
            url: `/${apiPrefix}accounts.hasVkProf`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _hasVkProfile
        });
        getHasOkProf();
    }
    function getHasOkProf(){
        app.route({
            method: GET,
            url: `/${apiPrefix}accounts.hasOkProf`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _hasOkProfile
        });
        getHasFbProf();
    }
    function getHasFbProf(){
        app.route({
            method: GET,
            url: `/${apiPrefix}accounts.hasFbProf`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _hasFbProfile
        });
        getLinkVkProfile();
    }
    function getLinkVkProfile(){
        app.route({
            method: GET,
            url: `/${apiPrefix}accounts.linkVkProfile`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _linkVkProfile
        });
        getLinkOkProfile();
    }
    function getLinkOkProfile(){
        app.route({
            method: GET,
            url: `/${apiPrefix}accounts.linkOkProfile`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _linkOkProfile
        });
        getLinkFbProfile();
    }
    function getLinkFbProfile(){
        app.route({
            method: GET,
            url: `/${apiPrefix}accounts.linkFbProfile`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _linkFbProfile
        });
        getUnlinkSocialProfile();
    }
    function getUnlinkSocialProfile(){
        app.route({
            method: GET,
            url: `/${apiPrefix}accounts.unlinkSocialProfile`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _unlinkSocialProfile
        });
    }

    postGetAccount();
}

function _getAccount(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    accounts.getAccount(
        req.sessionObject, req.query.gclientid, req.query.gclientsecret,
        req.query.vkid, req.query.fbid, req.query.okid,
        callbackFn
    );
}
function _hasVkProfile(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(goblinBase.vkCredentials){
        accounts.hasVkProfile(req.sessionObject, req.query.vktoken, req.clientPlatform, req.clientVersion, callbackFn);
    } else {
        res.code(501).send(new ErrorResponse(414, 'No VK credentials'));
    }
}
function _hasOkProfile(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(goblinBase.okCredentials){
        accounts.hasOkProfile(req.sessionObject, req.query.oktoken, req.clientPlatform, req.clientVersion, callbackFn);
    } else {
        res.code(501).send(new ErrorResponse(512, 'No OK credentials'));
    }
}
function _hasFbProfile(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(goblinBase.facebookCredentials){
        accounts.hasFbProfile(req.sessionObject, req.query.fbtoken, req.clientPlatform, req.clientVersion, callbackFn);
    } else {
        res.code(501).send(new ErrorResponse(513, 'No Facebook credentials'));
    }
}
function _linkVkProfile(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(goblinBase.vkCredentials){
        accounts.linkVkProfile(
            req.sessionObject, req.query.vktoken, !!req.query.noprof, req.clientPlatform, req.clientVersion,
            callbackFn
        );
    } else {
        res.code(501).send(new ErrorResponse(514, 'No VK credentials'));
    }
}
function _linkOkProfile(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(goblinBase.okCredentials){
        accounts.linkOkProfile(
            req.sessionObject, req.query.oktoken, !!req.query.noprof, req.clientPlatform, req.clientVersion,
            callbackFn
        );
    } else {
        res.code(501).send(new ErrorResponse(515, 'No OK credentials'));
    }
}
function _linkFbProfile(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(goblinBase.facebookCredentials){
        accounts.linkFbProfile(
            req.sessionObject, req.query.fbtoken, !!req.query.noprof, req.clientPlatform, req.clientVersion,
            callbackFn
        );
    } else {
        res.code(501).send(new ErrorResponse(516, 'No Facebook credentials'));
    }
}
function _unlinkSocialProfile(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    accounts.unlinkSocialProfile(req.sessionObject, callbackFn);
}