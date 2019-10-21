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
    function postMatchPlayer(){
        app.route({
            method: POST,
            url: `/${apiPrefix}mm.matchPlayer`,
            bodyLimit: BODY_LIMIT,
            preHandler: [
                bodyIsTheMust, measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _matchPlayer
        });
    }

    postMatchPlayer();
}

function _matchPlayer(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.matchmakingConfig){
        return res.code(501).send(new ErrorResponse(984, 'Matchmaking not configured'));
    }
    matchmaking.matchPlayerOpponent(
        req.sessionObject, req.clientPlatform, req.clientVersion, req.query.segment, req.query.strat,
        (req.body && _.size(req.body)) ? req.body : null,
        callbackFn
    );
}