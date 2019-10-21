'use strict';

const GET = 'GET',
    POST = 'POST';

module.exports = {
    register
};

var battles = require('../features/accountsAndProfiles/battleJournal.js');

const goblinBase = require('../../index.js').getGoblinBase();

var platformPlusVersionCheck = require('../webMiddleware/platformPlusVersionCheck.js').doCheck,
    sessionKeeper = require('../webMiddleware/sessionKeeper.js'),
    requestOrderValidation = require('../webMiddleware/requesOrderValidation.js').theCheck,
    hmacValidation = require('../webMiddleware/hmacValidation.js').theCheck,
    bgRefresher = require('../webMiddleware/bgRefresher.js').theDo,
    measureRequest = require('../generalUtils/metricsForStatsD.js').measureRequest,
    checkMaintenance = require('../webMiddleware/maintenanceManager.js').checkMaintenance;

var ErrorResponse = require('../objects/ErrorResponse.js');

function register(app, apiPrefix){
    function getBattlesListBattles(){
        if(goblinBase.pvpConfig){
            app.route({
                method: GET,
                url: `/${apiPrefix}battles.listBattles`,
                preHandler: [
                    measureRequest, checkMaintenance, platformPlusVersionCheck,
                    sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
                ],
                handler: _battlesListBattles
            });
        }
        getPveListBattles();
    }
    function getPveListBattles(){
        if(goblinBase.simplePveConfig){
            app.route({
                method: GET,
                url: `/${apiPrefix}pve.listBattles`,
                preHandler: [
                    measureRequest, checkMaintenance, platformPlusVersionCheck,
                    sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
                ],
                handler: _pveListBattles
            });
        }
    }

    getBattlesListBattles();
}

function _battlesListBattles(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.pvpConfig){
        return res.code(501).send(new ErrorResponse(520, 'PvP not configured'));
    }
    if(goblinBase.authoritarianConfig && goblinBase.authoritarianConfig.disallowDirectProfileExposure){
        return res.code(403).send(new ErrorResponse(521, 'Not allowed!'));
    }
    battles.listBattles(req.sessionObject, req.query.offset, req.query.limit, !!+req.query.auto, callbackFn);
}
function _pveListBattles(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.simplePveConfig){
        return res.code(501).send(new ErrorResponse(522, 'Simple PvE not configured'));
    }
    if(goblinBase.authoritarianConfig && goblinBase.authoritarianConfig.disallowDirectProfileExposure){
        return res.code(403).send(new ErrorResponse(117, 'Not allowed!'));
    }
    battles.listPveBattles(req.sessionObject, req.query.offset, req.query.limit, callbackFn);
}