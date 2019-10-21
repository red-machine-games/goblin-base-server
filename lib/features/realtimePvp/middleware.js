'use strict';

module.exports = {
    checkTheBooking,
    tryToAcquireLock
};

const log = require('../../../index.js').getGoblinBase().logsHook;

var _ = require('lodash');

const BOOKING_KEY_HEADER = require('../../webMiddleware/hmacValidation.js').BOOKING_KEY_HEADER;

var opClients = require('../../operativeSubsystem/opClients.js');

var ErrorResponse = require('../../objects/ErrorResponse.js');

function checkTheBooking(ipAddress, gameroomBookingTtl){
    return (req, res, next) => {
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 346, err: { code: err.code, command: err.command, message: err.message } });
                res.status(500).send(new ErrorResponse(346, 'OP Error'));
            } else if(response){
                let [pid, opponentPid, botOpponentProfileData] = response.split(';');
                req.pid = pid;
                req.opponentPid = opponentPid;
                req.bookingKey = bookingKey;
                if(botOpponentProfileData){
                    req.opponentIsBot = true;
                    req.botOpponentProfileData = (botOpponentProfileData === '-1') ? null : botOpponentProfileData;
                }
                next();
            } else {
                res.status(400).send(new ErrorResponse(347, 'Didn\'t found booking'));
            }
        };

        var bookingKey = _.getPropIgnoreCase(req.headers, BOOKING_KEY_HEADER);
        opClients.getMatchmakingClient()
            .checkGameplayRoomBooking([bookingKey, ipAddress, gameroomBookingTtl, _.now()], callbackFn);
    };
}
function tryToAcquireLock(pidIsMust, messageLockTtlMs){
    var pidIsMustStr = `${+pidIsMust}`;
    return (req, res, next) => {
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 351, err: { code: err.code, command: err.command, message: err.message } });
                res.status(500).send(new ErrorResponse(351, 'OP Error'));
            } else if(response){
                if(response === '-1'){
                    if(pidIsMust){
                        return res.status(400).send(new ErrorResponse(422, 'Didn\'t found booking'));
                    }
                } else if(!req.pid){
                    req.pid = response;
                }
                if(!req.bookingKey){
                    req.bookingKey = bookingKey;
                }
                next();
            } else {
                res.status(503).send(new ErrorResponse(352, 'Locked by exclusive lock'));
            }
        };

        var bookingKey = req.bookingKey || _.getPropIgnoreCase(req.headers, BOOKING_KEY_HEADER);
        opClients.getGameplayRoomClient().lockHttpByKey([bookingKey, messageLockTtlMs, pidIsMustStr], callbackFn);
    };
}