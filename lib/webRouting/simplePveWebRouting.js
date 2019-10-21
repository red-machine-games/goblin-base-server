'use strict';

const GET = 'GET',
    POST = 'POST';

module.exports = {
    register
};

var _ = require('lodash');

var simplePve = require('../features/pve/simplePve.js');

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
    function getBeginSimple(){
        app.route({
            method: GET,
            url: `/${apiPrefix}pve.beginSimple`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(goblinBase.cloudFunctionsConfig && goblinBase.cloudFunctionsConfig.customSession),
                requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _beginSimple
        });
        postBeginSimple();
    }
    function postBeginSimple(){
        app.route({
            method: POST,
            url: `/${apiPrefix}pve.beginSimple`,
            bodyLimit: BODY_LIMIT,
            preHandler: [
                bodyIsTheMust, measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(goblinBase.cloudFunctionsConfig && goblinBase.cloudFunctionsConfig.customSession),
                requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _beginSimple
        });
        getActSimple();
    }
    function getActSimple(){
        app.route({
            method: GET,
            url: `/${apiPrefix}pve.actSimple`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(goblinBase.cloudFunctionsConfig && goblinBase.cloudFunctionsConfig.customSession),
                requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _actSimple
        });
        postActSimple();
    }
    function postActSimple(){
        app.route({
            method: POST,
            url: `/${apiPrefix}pve.actSimple`,
            bodyLimit: BODY_LIMIT,
            preHandler: [
                bodyIsTheMust, measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(goblinBase.cloudFunctionsConfig && goblinBase.cloudFunctionsConfig.customSession),
                requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _actSimple
        });
    }

    getBeginSimple();
}

function _beginSimple(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.simplePveConfig){
        return res.code(501).send(new ErrorResponse(198, 'Simple PvE not configured'));
    }
    var clientSideParams;
    if(req.body && req.query){
        clientSideParams = _.extend(req.query, req.body);
    } else {
        clientSideParams = req.body || req.query || {};
    }
    simplePve.beginPve(clientSideParams, req.sessionObject, req.clientPlatform, req.clientVersion, callbackFn);
}
function _actSimple(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.simplePveConfig){
        return res.code(501).send(new ErrorResponse(646, 'Simple PvE not configured'));
    }
    var clientSideParams;
    if(req.body && req.query){
        clientSideParams = _.extend(req.query, req.body);
    } else {
        clientSideParams = req.body || req.query || {};
    }
    simplePve.actPve(req.sessionObject, clientSideParams, req.clientPlatform, req.clientVersion, callbackFn);
}