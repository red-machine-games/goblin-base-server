'use strict';

const UNICORN_HEADER = 'X-Unicorn';

module.exports = {
    getOrSetSession,
    setSession,
    getSession,
    pingSession,

    flushSession,
    markSessionToKill,

    destroySession,
    checkVkUserToken,
    checkOkUserToken,
    checkFbUserToken,

    UNICORN_HEADER
};

const goblinBase = require('../../index.js').getGoblinBase(),
    log = goblinBase.logsHook;

const G_CLIENT_SECRET_REGEXP = /[A-Za-z0-9._@]{6,64}$/,
    G_CLIENT_ID_REGEXP = /[A-Za-z0-9._@]{4,32}$/;

const PLATFORM_WEB_VK = require('./platformPlusVersionCheck.js').PLATFORM_WEB_VK,
    PLATFORM_WEB_OK = require('./platformPlusVersionCheck.js').PLATFORM_WEB_OK,
    PLATFORM_WEB_FB = require('./platformPlusVersionCheck.js').PLATFORM_WEB_FB,
    PLATFORM_ANDROID = require('./platformPlusVersionCheck.js').PLATFORM_ANDROID,
    PLATFORM_IOS = require('./platformPlusVersionCheck.js').PLATFORM_IOS,
    PLATFORM_STANDALONE = require('./platformPlusVersionCheck.js').PLATFORM_STANDALONE;

var _ = require('lodash'),
    crypto = require('crypto'),
    JsSha = require('jssha'),
    jsonpack = require('jsonpack');

var opClients = require('../operativeSubsystem/opClients.js'),
    vkService = require('../generalUtils/integrations/vkService.js'),
    okService = require('../generalUtils/integrations/okService.js'),
    fbService = require('../generalUtils/integrations/fbService.js');

var ErrorResponse = require('../objects/ErrorResponse.js');

var _useSubsession = goblinBase.cloudFunctionsConfig ? goblinBase.cloudFunctionsConfig.customSession : false,
    useSubsession = `${+_useSubsession}`,
    artificiallyLimitCCU = goblinBase.workloadControl ? goblinBase.workloadControl.artificiallyLimitCCU : 0;

function checkVkUserToken(vkToken, callback){
    var serviceToken;

    function doGetServiceToken(){
        let callbackFn = (err, laToken) => {
            if(err){
                callback(503, err);
            } else {
                serviceToken = laToken;
                doCheck();
            }
        };

        vkService.getServiceToken(callbackFn);
    }
    function doCheck(){
        let callbackFn = (err, code, response) => {
            if(err){
                callback(code, err);
            } else {
                callback(code, response);
            }
        };

        vkService.checkToken(vkToken, serviceToken, callbackFn);
    }

    doGetServiceToken();
}
function checkOkUserToken(okToken, callback){
    let callbackFn = (err, code, response) => {
        if(err){
            callback(code, err);
        } else {
            callback(code, response);
        }
    };

    okService.checkToken(okToken, callbackFn);
}
function checkFbUserToken(fbToken, callback){
    var theServiceMarker;

    function getTheServiceMarker(){
        let callbackFn = (err, laMarker) => {
            if(err){
                callback(503, err);
            } else {
                theServiceMarker = laMarker;
                doCheck();
            }
        };

        fbService.getServiceMarker(callbackFn);
    }
    function doCheck(){
        let callbackFn = (err, code, response) => {
            if(err){
                callback(code, err);
            } else {
                callback(code, response);
            }
        };

        fbService.checkUserToken(fbToken, theServiceMarker, callbackFn);
    }

    getTheServiceMarker();
}
function getOrSetSession(getSubsession){
    return function(req, res, next){
        if(_.getPropIgnoreCase(req.headers, UNICORN_HEADER)){
            getSession(getSubsession)(req, res, next);
        } else {
            setSession(req, res, next);
        }
    }
}
function setSession(req, res, next){
    function checkGclientIdAndSecret(){
        if(!req.query.gclientid && !req.query.gclientsecret
                && !req.query.vkid && !req.query.vksecret
                && !req.query.vktoken && !req.query.fbtoken
                && !req.query.okid && !req.query.oksessionkey && !req.query.oksecret && !req.query.oktoken){

            if(req.query.gcustomid && req.query.gcustomsecret){
                if(G_CLIENT_ID_REGEXP.test(req.query.gcustomid) && G_CLIENT_SECRET_REGEXP.test(req.query.gcustomsecret)){
                    req.query.gclientid = req.query.gcustomid;
                    req.query.gclientsecret = req.query.gcustomsecret;
                } else {
                    return res.code(400).send(new ErrorResponse(955, 'Your custom client id and secret looks bad'));
                }
            } else {
                let now = _.now(),
                    uint32rand = _.random(0, 4294967295),
                    theShaForShake = new JsSha('SHAKE128', 'TEXT');

                theShaForShake.update(now + goblinBase.accountsConfig.gClientSecretSalt + uint32rand);

                req.query.gclientid = crypto.createHash('md5')
                    .update(Buffer.from(now + goblinBase.accountsConfig.gClientIdSalt + uint32rand), 'binary').digest('hex');
                req.query.gclientsecret = theShaForShake.getHash('HEX', { shakeLen: 256 });
            }
            req.newMobileAnonClient = true;
        }
        mapSessionCreation();
    }
    function mapSessionCreation(){
        switch(req.clientPlatform){
            case PLATFORM_WEB_VK: addNewVkSession(req, res, next); break;
            case PLATFORM_WEB_FB: addNewFbSession(req, res, next); break;
            case PLATFORM_WEB_OK: addNewOkSession(req, res, next); break;
            case PLATFORM_ANDROID:
            case PLATFORM_IOS:
            case PLATFORM_STANDALONE:
                addNewMobileOrStandaloneSession(req, res, next);
                break;
            default:
                res.code(403).send(new ErrorResponse(577, 'Wrong client platform'));
        }
    }

    checkGclientIdAndSecret();
}
function addNewVkSession(req, res, next){
    var socSecret = req.query.vksecret,
        vkId = req.query.vkid;

    function checkStuff(){
        if(socSecret && vkId){
            let bufferToHash = Buffer.from(`${goblinBase.vkCredentials.clientId}_${vkId}_${goblinBase.vkCredentials.clientSecret}`, 'binary'),
                md5Secret = crypto.createHash('md5')
                    .update(bufferToHash)
                    .digest('hex');
            if(md5Secret === socSecret){
                addSession();
            } else {
                if(goblinBase.vkCredentials.devHelp){
                    res.code(401).send(new ErrorResponse(416, 'Wrong "auth_key"',
                        {
                            devHelp: `I take app id "${goblinBase.vkCredentials.clientId}", then I take app ` +
                            `secret "${goblinBase.vkCredentials.clientSecret}", and your ID ${vkId} and I get this ` +
                            `"${goblinBase.vkCredentials.clientId}_${vkId}_${goblinBase.vkCredentials.clientSecret}" ` +
                            `make MD5 and get this "${md5Secret}", but your secret is "${socSecret}".`
                        }
                    ));
                } else {
                    res.code(401).send(new ErrorResponse(416, 'Wrong social secret'));
                }
            }
        } else {
            res.code(401).send(new ErrorResponse(417, 'Neither unicorn nor social secret and id'));
        }
    }
    function addSession(){
        let callbackFn = (err, sessionObject) => {
            if(err){
                log.error('OP Error', { code: 418, err: { code: err.code, command: err.command, message: err.message } });
                res.code(500).send(new ErrorResponse(418, 'OP Error'));
            } else if(sessionObject){
                req.sessionObject = parseSessionObject(sessionObject);
                req.sessionObject.isNewSessionObject = true;
                req.sessionObject.vkId = vkId;
                next();
            } else {
                res.code(503).send(new ErrorResponse(1075, 'Too busy now!'));
            }
        };

        var newUnicorn = generateUnicorn(vkId);
        opClients.getSessionsClient().addUnicornSession([
            newUnicorn, goblinBase.accountsConfig.sessionLifetime, req.clientPlatform,
            _.now(), useSubsession, `vk/${vkId}`, artificiallyLimitCCU || -1
        ], callbackFn);
    }

    checkStuff();
}
function addNewFbSession(req, res, next){
    var fbToken = req.query.fbtoken,
        facebookId;

    function checkFbToken(){
        if(!fbToken || fbToken.length > 128){
            res.code(400).send(new ErrorResponse(419, 'No or invalid facebook token'));
        } else {
            checkFacebookClientMarker();
        }
    }
    function checkFacebookClientMarker(){
        if(goblinBase.facebookCredentials.useTokenAsId){
            facebookId = fbToken;
            addSession();
        } else {
            let callbackFn = (code, response) => {
                if(code === 200){
                    facebookId = response;
                    addSession();
                } else {
                    res.code(code).send(response);
                }
            };

            checkFbUserToken(fbToken, callbackFn);
        }
    }
    function addSession(){
        let callbackFn = (err, sessionObject) => {
            if(err){
                log.error('OP Error', { code: 420, err: { code: err.code, command: err.command, message: err.message } });
                res.code(500).send(new ErrorResponse(420, 'OP Error'));
            } else if(sessionObject){
                req.sessionObject = parseSessionObject(sessionObject);
                req.sessionObject.isNewSessionObject = true;
                req.sessionObject.fbId = facebookId;
                next();
            } else {
                res.code(503).send(new ErrorResponse(1076, 'Too busy now!'));
            }
        };

        var newUnicorn = generateUnicorn(facebookId);
        opClients.getSessionsClient().addUnicornSession([
            newUnicorn, goblinBase.accountsConfig.sessionLifetime, req.clientPlatform,
            _.now(), useSubsession, `fb/${facebookId}`, artificiallyLimitCCU || -1
        ], callbackFn);
    }

    checkFbToken();
}
function addNewOkSession(req, res, next){
    var socSecret = req.query.oksecret,
        okId = req.query.okid,
        sessionKey = req.query.oksessionkey;

    function checkStuff(){
        if(socSecret && okId && sessionKey){
            let md5Secret = crypto.createHash('md5').update(
                Buffer.from(okId + sessionKey + goblinBase.okCredentials.applicationSecretKey), 'binary'
            ).digest('hex');
            if(md5Secret === socSecret){
                addSession();
            } else if(goblinBase.okCredentials.devHelp){
                res.status(401).send(new ErrorResponse(436, 'Wrong social secret',
                    {
                        devHelp: `I take OK.ru ID "${okId}", then I take your session key ` +
                        `"${sessionKey}", and OK application secret key ${goblinBase.okCredentials.applicationSecretKey} ` +
                        `and I get this ` +
                        `"${okId}${sessionKey}${goblinBase.okCredentials.applicationSecretKey}" ` +
                        `make MD5 and get this "${md5Secret}", but your secret is "${socSecret}".`
                    }
                ));
            } else {
                res.status(401).send(new ErrorResponse(436, 'Wrong social secret'));
            }
        } else {
            res.code(401).send(new ErrorResponse(437, 'Neither unicorn nor social secret and id and OK session key'));
        }
    }
    function addSession(){
        let callbackFn = (err, sessionObject) => {
            if(err){
                log.error('OP Error', { code: 438, err: { code: err.code, command: err.command, message: err.message } });
                res.code(500).send(new ErrorResponse(438, 'OP Error'));
            } else if(sessionObject){
                req.sessionObject = parseSessionObject(sessionObject);
                req.sessionObject.isNewSessionObject = true;
                req.sessionObject.okId = okId;
                next();
            } else {
                res.code(503).send(new ErrorResponse(1077, 'Too busy now!'));
            }
        };

        var newUnicorn = generateUnicorn(okId);
        opClients.getSessionsClient().addUnicornSession([
            newUnicorn, goblinBase.accountsConfig.sessionLifetime, req.clientPlatform,
            _.now(), useSubsession, `ok/${okId}`, artificiallyLimitCCU || -1
        ], callbackFn);
    }

    checkStuff();
}
function addNewMobileOrStandaloneSession(req, res, next){
    var gClientId = req.query.gclientid,
        gClientSecret = req.query.gclientsecret,
        vkToken = req.query.vktoken,
        fbToken = req.query.fbtoken,
        okToken = req.query.oktoken,
        identifier;

    function checkMethod(){
        if(vkToken){
            if(vkToken.length < 128){
                checkVkToken();
            } else {
                res.code(400).send(new ErrorResponse(941, 'Got VK token but it seems incorrect'));
            }
        } else if(fbToken){
            if(fbToken.length < 256){
                checkFacebookClientMarker();
            } else {
                res.code(400).send(new ErrorResponse(942, 'Got FB token but it seems incorrect'));
            }
        } else if(okToken){
            if(okToken.length < 128){
                checkOkToken();
            } else {
                res.code(400).send(new ErrorResponse(943, 'Got OK token and secret but some of them seems incorrect'));
            }
        } else if(gClientId && gClientSecret){
            if(G_CLIENT_ID_REGEXP.test(gClientId) && G_CLIENT_SECRET_REGEXP.test(gClientSecret)){
                identifier = `g/${gClientId}`;
                addSession();
            } else {
                res.code(400).send(new ErrorResponse(944, 'Got G client and secret but some of them seems incorrect'));
            }
        } else {
            res.code(400).send(new ErrorResponse(421, 'Cannot take any bits to identify you'));
        }
    }
    function checkVkToken(){
        if(!goblinBase.vkCredentials){
            res.code(400).send(new ErrorResponse(950, 'Does not have credentials to login VK'));
        } else if(goblinBase.vkCredentials.useTokenAsId) {
            req.query.vkid = vkToken;
            identifier = `vk/${vkToken}`;
            addSession();
        } else {
            let callbackFn = (code, response) => {
                if(code === 200){
                    req.query.vkid = response;
                    identifier = `vk/${response}`;
                    addSession();
                } else {
                    res.code(code).send(response);
                }
            };

            checkVkUserToken(vkToken, callbackFn);
        }
    }
    function checkFacebookClientMarker(){
        if(!goblinBase.facebookCredentials){
            res.code(400).send(new ErrorResponse(951, 'Does not have credentials to login Facebook'));
        } else if(goblinBase.facebookCredentials.useTokenAsId){
            req.query.fbid = fbToken;
            identifier = `fb/${fbToken}`;
            addSession();
        } else {
            let callbackFn = (code, response) => {
                if(code === 200){
                    req.query.fbid = response;
                    identifier = `fb/${response}`;
                    addSession();
                } else {
                    res.code(code).send(response);
                }
            };

            checkFbUserToken(fbToken, callbackFn);
        }
    }
    function checkOkToken(){
        if(!goblinBase.okCredentials){
            res.code(400).send(new ErrorResponse(952, 'Does not have credentials to login OK'));
        } else if(goblinBase.okCredentials.useTokenAsId){
            req.query.okid = okToken;
            identifier = `ok/${okToken}`;
            addSession();
        } else {
            let callbackFn = (code, response) => {
                if(code === 200){
                    req.query.okid = response;
                    identifier = `ok/${response}`;
                    addSession();
                } else {
                    res.code(code).send(response);
                }
            };

            checkOkUserToken(okToken, callbackFn);
        }
    }
    function addSession(){
        let callbackFn = (err, sessionObject) => {
            if(err){
                log.error('OP Error', { code: 864, err: { code: err.code, command: err.command, message: err.message } });
                res.code(500).send(new ErrorResponse(864, 'OP Error', null));
            } else if(sessionObject){
                req.sessionObject = parseSessionObject(sessionObject);
                req.sessionObject.isNewSessionObject = true;
                if(req.newMobileAnonClient){
                    req.sessionObject.newMobileAnonClient = req.newMobileAnonClient;
                    req.sessionObject.gClientId = req.query.gclientid;
                    req.sessionObject.gClientSecret = req.query.gclientsecret;
                }
                next();
            } else {
                res.code(503).send(new ErrorResponse(1078, 'Too busy now!'));
            }
        };

        var newUnicorn = generateUnicorn(identifier);
        opClients.getSessionsClient().addUnicornSession([
            newUnicorn, goblinBase.accountsConfig.sessionLifetime, req.clientPlatform,
            _.now(), useSubsession, identifier, artificiallyLimitCCU || -1
        ], callbackFn);
    }

    checkMethod();
}
function getSession(getSubsession, noSessionLock){
    return function(req, res, next){
        var unicorn = _.getPropIgnoreCase(req.headers, UNICORN_HEADER);
        if(unicorn){
            let callbackFn = (err, sessionObject) => {
                if(err){
                    log.error('OP Error', { code: 566, err: { code: err.code, command: err.command, message: err.message } });
                    res.code(500).send(new ErrorResponse(566, 'OP Error', null));
                } else if(sessionObject){
                    if(sessionObject === '-1'){
                        res.code(401).send(new ErrorResponse(699, 'You are trying to use single session in parallel'));
                    } else {
                        req.sessionObject = parseSessionObject(sessionObject);
                        next();
                    }
                } else {
                    res.code(401).send(new ErrorResponse(423, 'Unknown unicorn', null));
                }
            };

            opClients.getSessionsClient()
                .getUnicornSession([
                    unicorn, goblinBase.accountsConfig.sessionLifetime, req.clientPlatform,
                    _.now(), +(_useSubsession && getSubsession) + '', noSessionLock ? '1' : '0'
                ], callbackFn);
        } else {
            res.code(401).send(new ErrorResponse(424, 'No unicorn', null));
        }
    };
}
function pingSession(req, res, next) {
    var unicorn = _.getPropIgnoreCase(req.headers, UNICORN_HEADER);

    if(unicorn){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 890, err: { code: err.code, command: err.command, message: err.message } });
                res.code(500).send(new ErrorResponse(890, 'OP Error'));
            } else if(response === '1'){
                next();
            } else {
                res.code(401).send(new ErrorResponse(891, 'Unknown unicorn'));
            }
        };

        opClients.getSessionsClient()
            .pingUnicornSession([
                unicorn, goblinBase.accountsConfig.sessionLifetime, goblinBase.accountsConfig.lastActionTimeout, req.clientPlatform,
                _.now(), useSubsession
            ], callbackFn);
    } else {
        res.code(401).send(new ErrorResponse(892, 'No unicorn', null));
    }
}
function flushSession(sessionDelta, newSession, newSubsession, callback){
    var unicorn = newSession ? newSession.unicorn || null : null;

    if(!_.isNull(sessionDelta)){
        let keys = [unicorn];

        if(newSubsession){
            keys.push(jsonpack.pack(newSubsession));
        } else{
            keys.push('-1');
        }

        if(!_.isUndefined(sessionDelta.a)){
            keys.push('#am');
            _.each(sessionDelta.a, a => keys.push(a, _.isObject(newSession[a]) ? JSON.stringify(newSession[a]) : newSession[a]));
            if(!_.isUndefined(sessionDelta.m)){
                _.each(sessionDelta.m, m => keys.push(m, _.isObject(newSession[m]) ? JSON.stringify(newSession[m]) : newSession[m]));
            }
        } else if(!_.isUndefined(sessionDelta.m)){
            keys.push('#am');
            _.each(sessionDelta.m, m => keys.push(m, _.isObject(newSession[m]) ? JSON.stringify(newSession[m]) : newSession[m]));
            if(!_.isUndefined(sessionDelta.a)){
                _.each(sessionDelta.a, a => keys.push(a, _.isObject(newSession[a]) ? JSON.stringify(newSession[a]) : newSession[a]));
            }
        }
        if(!_.isUndefined(sessionDelta.d)){
            keys.push('#d');
            _.each(sessionDelta.d, d => keys.push(d));
        }

        opClients.getSessionsClient().flushSessionDelta(keys, callback);
    } else if(unicorn){
        if(newSubsession){
            opClients.getSessionsClient().flushSubsession([unicorn, jsonpack.pack(newSubsession)], callback)
        } else {
            opClients.getSessionsClient().justUnlockSession([unicorn], callback);
        }
    } else {
        callback(null);
    }
}
function markSessionToKill(unicorn, callback){
    let callbackFn = err => {
        if(err){
            log.error('OP Error', { code: 920, err: { code: err.code, command: err.command, message: err.message } });
            callback(new ErrorResponse(920, 'OP Error'));
        } else {
            callback(null);
        }
    };

    opClients.getSessionsClient().getRedis().hset(`sess:${unicorn}`, 'kill', '1', callbackFn);
}
function destroySession(sessionObject, callback){
    opClients.getSessionsClient().destroySession([sessionObject.unicorn, useSubsession], callback);
}

function parseSessionObject(sessionObjectData){
    var out = JSON.parse(sessionObjectData);

    if(!_.isUndefined(out.plat)){
        out.platform = out.plat;
        delete out.plat;
    }
    if(!_.isUndefined(out.rsq)){
        out.requestSequence = _.parseIntOrNull(out.rsq);
        delete out.rsq;
    }
    if(!_.isUndefined(out.subs)){
        if(out.subs === 'stub'){
            out.subs = {};
        } else {
            out.subs = jsonpack.unpack(out.subs);
        }
    }
    if(!_.isUndefined(out.prrt)){
        out.prrt = parseInt(out.prrt);
    }
    if(!_.isUndefined(out.cat)){
        out.cat = parseInt(out.cat);
    }
    if(!_.isUndefined(out.lact)){
        out.lact = parseInt(out.lact);
    }
    if(!_.isUndefined(out.hid)){
        out.hid = parseInt(out.hid);
    }

    return out;
}
function generateUnicorn(someIdentifier){
    var theShaForSha3_224 = new JsSha('SHA3-224', 'TEXT');
    theShaForSha3_224.update(someIdentifier + _.now() + goblinBase.accountsConfig.unicornSalt);
    return theShaForSha3_224.getHash('HEX');
}