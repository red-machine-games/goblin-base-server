'use strict';

const GET = 'GET',
    POST = 'POST';

module.exports = {
    register
};

var profiles = require('../features/accountsAndProfiles/profiles.js');

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
    function getCreateProfile(){
        app.route({
            method: GET,
            url: `/${apiPrefix}profile.createProfile`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation
            ],
            handler: _createProfile
        });
        getGetProfile();
    }
    function getGetProfile(){
        app.route({
            method: GET,
            url: `/${apiPrefix}profile.getProfile`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _getProfile
        });
        postSetProfile();
    }
    function postSetProfile(){
        app.route({
            method: POST,
            url: `/${apiPrefix}profile.setProfile`,
            bodyLimit: BODY_LIMIT,
            preHandler: [
                bodyIsTheMust, measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _setProfile
        });
        postUpdateProfile();
    }
    function postUpdateProfile(){
        app.route({
            method: POST,
            url: `/${apiPrefix}profile.updateProfile`,
            bodyLimit: BODY_LIMIT,
            preHandler: [
                bodyIsTheMust, measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _updateProfile
        });
        postModifyProfile();
    }
    function postModifyProfile(){
        app.route({
            method: POST,
            url: `/${apiPrefix}profile.modifyProfile`,
            bodyLimit: BODY_LIMIT,
            preHandler: [
                bodyIsTheMust, measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _modifyProfile
        });
        getGetPublicProfile();
    }
    function getGetPublicProfile(){
        app.route({
            method: GET,
            url: `/${apiPrefix}profile.getPublicProfile`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _getPublicProfile
        });
    }

    getCreateProfile();
}

function _createProfile(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    profiles.createProfile(req.sessionObject, req.clientPlatform, req.clientVersion, callbackFn);
}
function _getProfile(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    profiles.getProfile(req.sessionObject, req.clientPlatform, req.clientVersion, callbackFn);
}
function _setProfile(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.authoritarianConfig || !goblinBase.authoritarianConfig.disallowDirectProfileExposure){
        profiles.setProfile(req.sessionObject, req.body, callbackFn);
    } else {
        res.code(403).send(new ErrorResponse(673, 'Not allowed!'));
    }
}
function _updateProfile(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.authoritarianConfig || !goblinBase.authoritarianConfig.disallowDirectProfileExposure){
        profiles.updateProfile(req.sessionObject, req.body, callbackFn);
    } else {
        res.code(403).send(new ErrorResponse(672, 'Not allowed!'));
    }
}
function _modifyProfile(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.authoritarianConfig || !goblinBase.authoritarianConfig.disallowDirectProfileExposure){
        profiles.updateProfileJP(req.sessionObject, req.body, callbackFn);
    } else {
        res.code(403).send(new ErrorResponse(674, 'Not allowed!'));
    }
}
function _getPublicProfile(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    profiles.getPublicProfile(req.sessionObject, parseInt(req.query.hid), callbackFn);
}